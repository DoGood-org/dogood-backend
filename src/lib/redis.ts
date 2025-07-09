import logger from '@/utils/logger';
import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
});

redis.on('connect', () => {
  logger.info('[Redis] Connected');
});

redis.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});

export default redis;

