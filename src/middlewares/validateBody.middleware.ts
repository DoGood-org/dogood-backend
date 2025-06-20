import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';

export const validateBodyMiddleware = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.errors.map((err) => err.message).join(', ');

      logger.warn(`Validation error: ${message}`, {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
      });

      return next(httpError(400, message));
    }

    next();
  };
};
