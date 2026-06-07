import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { verifyToken } from '@/utils/verifyToken';
import { ErrorCode } from '@/constants/apiCodes';
import { authServices } from '@/services/auth.service';

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
      logger.warn('❌ No token provided');
      return next(httpError(401, 'Authentication required', ErrorCode.AUTH_REFRESH_TOKEN_INVALID));
    }

    const decoded = verifyToken(token, 'access');

    logger.info('✅ Decoded token:', { decoded });

    const userData = await authServices.findAuthUser(decoded.userId);
    if (!userData) {
      logger.warn('❌ User not found', { userId: decoded.userId });
      return next(httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND));
    }

    if (userData.status === 'BANNED') {
      logger.warn('❌ Banned user blocked by middleware', { userId: userData.id });

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      return res.status(403).json({
        message: 'Your account has been suspended',
        code: ErrorCode.USER_WAS_BANNED, 
        bannedUser: {
          accountId: userData.id,
          suspendedOn: (userData as any).createdAt || new Date(), 
          suspensionType: userData.banType,
          reason: userData.banReason || 'Access restricted due to a community guidelines violation',
          banExpiresAt: userData.banExpiresAt
        }
      });
    }

    if (!userData.isEmailVerified) {
      logger.warn('❌ User email not verified', { userId: userData.id });
      return next(httpError(403, 'Please verify your email', ErrorCode.AUTH_EMAIL_NOT_VERIFIED));
    }
    

    req.user = userData;

    logger.info('✅ Token verified successfully. Can proceed with request.', {
      userId: userData.id,
    });
    next();
  } catch (error) {
    logger.error('❌ Token verification failed', { error });
    next(httpError(401, 'Invalid or expired token', ErrorCode.AUTH_REFRESH_TOKEN_INVALID));
  }
};
