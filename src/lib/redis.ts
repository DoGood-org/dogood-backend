import {
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USE_TLS,
} from '@/config/env';
import logger from '@/utils/logger';
import Redis from 'ioredis';

const redis = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined,
  tls: REDIS_USE_TLS === 'true' ? {} : undefined,
});

redis.on('connect', () => {
  logger.info(`[Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
});

redis.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});

export default redis;
