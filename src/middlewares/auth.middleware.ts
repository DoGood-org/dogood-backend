import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { findUserByIdService } from '@/services/auth.service';
import { verifyToken } from '@/utils/verifyToken';

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // const authHeader = req.headers.authorization;
    // const tokenFromHeader = authHeader?.startsWith('Bearer ')
    //   ? authHeader.slice(7)
    //   : null;
    const token = req.cookies?.accessToken;
    if (!token) {
      logger.warn('No token provided');
      return next(httpError(401, 'Authentication required'));
    }

    const decoded = verifyToken(token, 'access');

    logger.debug('Decoded token:', { decoded });

    const user = await findUserByIdService(decoded.userId);
    if (!user) {
      logger.warn('User not found', { userId: decoded.userId });
      return next(httpError(404, 'User not found'));
    }

    if (!user.isEmailVerified) {
      logger.warn('User email not verified', { userId: user.id });
      return next(httpError(403, 'Please verify your email'));
    }
    // Remove password from user object for security
    const {
      password: _password,
      emailVerificationCode: _emailVerificationCode,
      emailVerificationExpiresAt: _emailVerificationExpiresAt,
      resetPasswordToken: _resetPasswordToken,
      resetPasswordExpiresAt: _resetPasswordExpiresAt,
      ...safeUser
    } = user;

    req.user = safeUser;

    logger.info('Token verified successfully. Can proceed with request.', {
      userId: user.id,
    });
    next();
  } catch (error) {
    logger.error('Token verification failed', { error });
    next(httpError(401, 'Invalid or expired token'));
  }
};
