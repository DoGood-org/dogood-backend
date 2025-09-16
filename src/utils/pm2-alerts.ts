import * as pm2 from 'pm2';
import axios from 'axios';
import logger from './logger';
import { httpError } from '@/helpers/httpError';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw httpError(
    500,
    'Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID'
  );
}

// ==== Telegram helper ====
async function sendTelegramMessage(message: string) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }
    );
  } catch (err) {
    logger.error('❌ Failed to send Telegram message:', err);
  }
}

// ==== PM2 types ====
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

// ==== PM2 watcher ====
pm2.connect((err) => {
  if (err) {
    logger.error('❌ PM2 connect error:', err);
    throw httpError(500, `PM2 connect failed: ${err.message || err}`);
  }

  pm2.launchBus((err, bus) => {
    if (err) {
      logger.error('❌ PM2 bus error:', err);
      throw httpError(500, `PM2 bus failed: ${err.message || err}`);
    }

    logger.info('✅ PM2 watcher started');

    // sent logger.error messages to Telegram
    if ('on' in logger) {
      logger.on('data', async (log) => {
        if (log.level === 'error') {
          await sendTelegramMessage(`💥 ${log.message}`);
        }
      });
    }

    // App online
    bus.on('process:online', async (data: PM2ProcessEvent) => {
      logger.info(`✅ App online: ${data.process.name}`);
      try {
        await sendTelegramMessage(`✅ App online: ${data.process.name}`);
      } catch {
        logger.error('❌ Failed to send Telegram message');
      }
    });

    // App stopped
    bus.on('process:stop', async (data: PM2ProcessEvent) => {
      logger.warn(`🛑 App stopped: ${data.process.name}`);
      try {
        await sendTelegramMessage(`🛑 App stopped: ${data.process.name}`);
      } catch {
        logger.error('❌ Failed to send Telegram message');
      }
    });

    // App restarted
    bus.on('process:restart', async (data: PM2ProcessEvent) => {
      logger.info(`🔄 App restarted: ${data.process.name}`);
      try {
        await sendTelegramMessage(
          `🔄 App restarted: ${data.process.name}, Error: ${data.err || 'Unknown'}`
        );
      } catch {
        logger.error('❌ Failed to send Telegram message');
      }
    });
  });
});
