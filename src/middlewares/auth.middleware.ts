import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from '@/config/env';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { findUserByIdService } from '@/services/auth.service';

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : req.cookies?.token;

    if (!rawToken) {
      logger.warn('No token provided');
      return next(httpError(401, 'No token provided'));
    }

    const decoded = jwt.verify(rawToken, JWT_SECRET!) as {
      userId: number;
      siteRole: string;
    };

    logger.debug('Decoded token:', { decoded });

    const user = await findUserByIdService(decoded.userId);
    if (!user) {
      logger.warn('User not found during token verification', {
        userId: decoded.userId,
      });
      return next(httpError(404, 'User not found'));
    }

    req.user = { ...user, id: user.id, siteRole: decoded.siteRole };
    logger.info('Token verified successfully. Can proceed with request.', {
      userId: user.id,
      siteRole: decoded.siteRole,
    });
    next();
  } catch (error) {
    logger.error('Token verification failed', { error });
    next(httpError(401, 'Invalid or expired token'));
  }
};
