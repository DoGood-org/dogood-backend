import redis from '@/lib/redis';
import logger from '@/utils/logger';

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (!redis) {
      logger.warn('Redis client is not initialized');
      return null;
    }

    const cached = await redis.get(key);
    logger.info(`Cache retrieved for key: ${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logger.error(`Failed to get cache for key: ${key}`, { error });
    return null;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds = 600
): Promise<void> => {
  try {
    if (!redis) {
      logger.warn('Redis client is not initialized');
      return;
    }

    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    logger.info(`Cache set for key: ${key} with TTL: ${ttlSeconds}`);
  } catch (error) {
    logger.error(`Failed to set cache for key: ${key}`, { error });
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    if (!redis) {
      logger.warn('Redis client is not initialized');
      return;
    }

    await redis.del(key);
    logger.info(`Cache deleted for key: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete cache for key: ${key}`, { error });
  }
};
