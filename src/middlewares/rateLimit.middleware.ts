import { Request, Response, NextFunction } from 'express';
import redis from '@/lib/redis';
import logger from '@/utils/logger';

interface RateLimitOptions {
  keyPrefix: string; 
  windowSeconds: number; 
  maxRequests: number; 
}

export const rateLimitMiddleware = ({
  keyPrefix,
  windowSeconds,
  maxRequests,
}: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      const identifier = req.ip; 

      const redisKey = `${keyPrefix}:${identifier}`;

      const current = await redis.incr(redisKey);

      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      if (current > maxRequests) {
        return res
          .status(429)
          .json({ message: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next();
    }
  };
};
