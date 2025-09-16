import { httpError } from '@/helpers/httpError';
import axios from 'axios';
import pm2 from 'pm2';
import logger from './logger';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

interface PM2ProcessEvent {
  process: {
    name: string;
    pm_id: number;
    pid: number;
    pm_uptime: number;
    restart_time: number;
  };
  err?: string;
}

function sendTelegramMessage(message: string) {
  return axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    }
  );
}

pm2.connect((err) => {
  logger.info('🔔 Setting up PM2 alerts...');
  if (err) {
    logger.error('❌ PM2 connect error:', err);
    throw httpError(500, `PM2 connect failed: ${err.message || err}`);
  }

  pm2.launchBus((err, bus) => {
    if (err) {
      logger.error('❌ PM2 launchBus error:', err);
      throw httpError(500, `PM2 bus failed: ${err.message || err}`);
    }

    bus.on('process:exit', async (data: PM2ProcessEvent) => {
      logger.error('❌ App crashed:', data.process.name, data.err || '');
      try {
        await sendTelegramMessage(
          `❌ App crashed: ${data.process.name}, Error: ${data.err || 'Unknown'}`
        );
      } catch (error) {
        logger.error('❌ Failed to send Telegram message:', error);
      }
    });

    bus.on('process:restart', async (data: PM2ProcessEvent) => {
      logger.info('🔄 App restarted:', data.process.name);
      try {
        await sendTelegramMessage(
          `🔄 App restarted: ${data.process.name}, Error: ${data.err || 'Unknown'}`
        );
      } catch (error) {
        logger.error('❌ Failed to send Telegram message:', error);
      }
    });
  });
});
