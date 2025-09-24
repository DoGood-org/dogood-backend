import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '@/config/env';
import logger from './logger';
import { httpError } from '@/helpers/httpError';

type TokenType = 'access' | 'refresh';

export const verifyToken = (
  token: string,
  type: TokenType = 'access'
): { userId: string; siteRole?: string } => {
  try {
    const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error(`Missing JWT secret for type: ${type}`);
    }

    return jwt.verify(token, secret) as { userId: string; siteRole?: string };
  } catch (error) {
    logger.warn('Token verification failed', { tokenType: type, error });
    throw httpError(401, 'Invalid or expired token');
  }
};
