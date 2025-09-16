import { httpError } from '@/helpers/httpError';
import axios from 'axios';
import pm2 from 'pm2';
import logger from './logger';

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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  logger.error(
    '❌ Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID'
  );
  throw httpError(
    500,
    'Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID'
  );
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

logger.on('data', async (log) => {
  try {
    if (log.level === 'error') {
      await sendTelegramMessage(
        `🔥 [${log.level.toUpperCase()}] ${log.message}`
      );
    }
  } catch (err) {
    logger.error('❌ Failed to send Telegram log message:', err);
  }
});

// ==== PM2 events ====
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

    bus.on('process:online', async (data: PM2ProcessEvent) => {
      logger.info('✅ App online:', data.process.name);
      try {
        await sendTelegramMessage(`✅ App online: ${data.process.name}`);
      } catch (error) {
        logger.error('❌ Failed to send Telegram message:', error);
      }
    });

    bus.on('process:stop', async (data: PM2ProcessEvent) => {
      logger.warn('🛑 App stopped:', data.process.name);
      try {
        await sendTelegramMessage(`🛑 App stopped: ${data.process.name}`);
      } catch (error) {
        logger.error('❌ Failed to send Telegram message:', error);
      }
    });

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
