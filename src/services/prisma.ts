import { PrismaClient } from '@prisma/client';
import logger from '@/utils/logger';

export const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Prisma connected to PostgreSQL');
  } catch (error) {
    logger.error('❌ Prisma connection error', error);
    throw new Error('Failed to connect to database');
  }
};
