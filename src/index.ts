import { config } from 'dotenv';
import appWrapper from './app';
import logger from './utils/logger';
import { connectDB } from './config/prisma';

config();

const PORT = process.env.PORT || 5000;

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
