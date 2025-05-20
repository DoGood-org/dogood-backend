import { config } from 'dotenv';
import { connectDB } from './config/db';
import app from './app';
import logger from './utils/logger';

config();

const PORT = process.env.PORT || 5000;

// Запуск сервера
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`❌ Server failed to start: ${error}`);
    process.exit(1);
  }
};

startServer();
