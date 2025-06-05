import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { httpError } from '../helpers/httpError';
import logger from '@/utils/logger';

export const validateBody = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ');

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
