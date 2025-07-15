import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '@/utils/logger';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
      logger.error('Controller error', {
        error: error instanceof Error ? error.message : error,
      });

      next(error);
    });
  };
};
