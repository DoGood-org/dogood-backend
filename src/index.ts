import { config } from 'dotenv';
import { connectDB } from './services/db';
import appWrapper from './app';
import logger from './utils/logger';

config();

const PORT = process.env.PORT || 5000;

// Запуск сервера
const startServer = async () => {
  try {
    await connectDB();

    appWrapper.server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`❌ Server failed to start: ${error}`);
    throw new Error('DB connection failed');
  }
};

startServer();
