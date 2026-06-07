import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { addDays, addMinutes } from 'date-fns';
import { generateToken } from '@/utils/generateToken';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { comparePasswords } from '@/utils/comparePasswords';
import { generateVerificationCode } from '@/utils/generateVerificationCode';
import { getVerificationEmailHtml } from '@/emails/verificationEmail';
import { sendEmail } from '@/utils/sendEmail';
import { asyncHandler } from '@/decorators/asyncHandler';
import { verifyToken } from '@/utils/verifyToken';
import { parseExpirationToSeconds } from '@/utils/parseExpiration';
import { sendResetPasswordEmail } from '@/utils/sendResetPasswordEmail';
import { SuccessCode, ErrorCode } from '@/constants/apiCodes';
import { authServices } from '@/services/auth.service';
import { isLang, Lang } from '@/utils/typeGuardForLang';
import { userServices } from '@/services/user.service';
import { sanitizeUser } from '@/utils/sanitizeUser';

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password } = req.body;
  const queryLang = req.query.lang;
  const lang: Lang = isLang(queryLang) ? queryLang : 'en';

  const existingUser = await authServices.findUserByEmail(email);
  if (existingUser) {
    logger.warn('❌ User already exists during sign up', { email });
    return next(
      httpError(409, 'User already exists', ErrorCode.USER_ALREADY_EXISTS)
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailVerificationCode = generateVerificationCode();
  const emailVerificationExpiresAt = addMinutes(new Date(), 10);

  const newUser = await authServices.createUser({
    name,
    email,
    password: hashedPassword,
    emailVerificationCode,
    emailVerificationExpiresAt,
  });

  const html = getVerificationEmailHtml(emailVerificationCode, lang);
  await sendEmail(newUser.email, 'Email Verification', html);

  logger.info('✅ Verification email sent', { userId: newUser.id, email });
  res.status(201).json({
    status: 'success',
    code: SuccessCode.USER_REGISTERED,
    message: 'User created. Please check your email to verify.',
  });
};

const logIn = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await authServices.findUserByEmail(email);
  if (!user) {
    logger.warn('❌ User not found during login', { email });
    return next(
      httpError(
        400,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS
      )
    );
  }

  const isUnbanned = await authServices.checkAndReleaseBan(
    user.id,
    user.status as string,
    user.banType as string,
    user.banExpiresAt
  );

  if (!isUnbanned) {
    logger.warn('❌ Banned user tried to refresh tokens', { userId: user.id, banType: user.banType });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(403).json({
      message: 'Access denied. Account suspended.',
      code: ErrorCode.USER_WAS_BANNED,
      bannedUser: {
        accountId: user.id,
        suspendedOn: user.createdAt,
        suspensionType: user.banType,
        reason: user.banReason || 'Access restricted due to a community guidelines violation',
        banExpiresAt: user.banExpiresAt
      }
    });
  }

  if (!user.isEmailVerified) {
    logger.warn('❌ Email not verified during login', { userId: user.id });
    return next(
      httpError(
        403,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED
      )
    );
  }

  const isMatch = await comparePasswords(password, user.password);
  if (!isMatch) {
    logger.warn('❌ Invalid password during login', { userId: user.id });
    return next(
      httpError(
        400,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS
      )
    );
  }

  const isProd = process.env.NODE_ENV === 'production';

  const accessToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'access'
  );
  const refreshToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'refresh'
  );
  logger.info('✅ Tokens generated during login', { userId: user.id });

  await authServices.saveRefreshToken(
    user.id,
    refreshToken,
    addMinutes(new Date(), 43200)
  );
  logger.info('✅ Refresh token saved to database', { userId: user.id });

  const ttlSeconds = parseExpirationToSeconds(
    process.env.JWT_REFRESH_EXPIRATION || '30d'
  );

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 хв
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: ttlSeconds * 1000,
  });

  const userSettings = {
    theme: user.userSettings?.theme || 'light',
    language: user.userSettings?.language || 'en',
  };

  logger.info('✅ User logged in successfully', { userId: user.id });

  // Remove expired tokens periodically
  await authServices.cleanupExpiredRefreshTokens();

  res.status(200).json({
    message: 'User logged in successfully',
    code: SuccessCode.USER_LOGGED_IN,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.profile?.avatar || null,
      siteRole: user.siteRole,
      settings: userSettings,
      profile: user.profile || null,
    },
  });
};

const logOut = async (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';

  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return next(
      httpError(
        400,
        'No refresh token provided',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID
      )
    );
  }

  const decoded = verifyToken(refreshToken, 'refresh');

  await authServices.deleteUserRefreshTokens(decoded.userId);
  logger.info('✅ Refresh tokens deleted from database', {
    userId: decoded.userId,
  });

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });

  logger.info('✅ User logged out');

  return res.status(204).end();
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { verificationCode } = req.params;

  const user = await authServices.findUserByVerificationCode(verificationCode);

  if (!user) {
    logger.warn('❌ Email verification failed: invalid code', {
      verificationCode,
    });
    return next(
      httpError(
        400,
        'Invalid verification code',
        ErrorCode.EMAIL_VERIFICATION_INVALID
      )
    );
  }

  if (user.isEmailVerified) {
    logger.info('✅ Email already verified', { userId: user.id });
    return res.status(200).json({
      status: 'success',
      code: SuccessCode.EMAIL_ALREADY_VERIFIED,
      message: 'Email already verified',
    });
  }

  if (
    user.emailVerificationExpiresAt &&
    user.emailVerificationExpiresAt < new Date()
  ) {
    logger.warn('❌ Email verification failed: verification code expired', {
      userId: user.id,
      verificationCode,
    });
    return next(
      httpError(
        400,
        'Verification code expired',
        ErrorCode.EMAIL_VERIFICATION_EXPIRED
      )
    );
  }

  const verifiedUser = await authServices.updateUserEmailVerified(user.id);
  logger.info('✅ Email verification successful', { userId: verifiedUser.id });

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.EMAIL_VERIFICATION_SUCCESS,
    message: 'Email successfully verified',
  });
};

const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const queryLang = req.query.lang;
  const lang: Lang = isLang(queryLang) ? queryLang : 'en';

  const user = await authServices.findUserByEmail(email);
  if (!user) {
    logger.warn('❌ Resend verification requested for non-existent email', {
      email,
    });
    return next(httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND));
  }

  if (user.isEmailVerified) {
    logger.info('✅ Resend verification requested for already verified email', {
      userId: user.id,
    });
    return res.status(200).json({
      message: 'Email already verified',
      code: SuccessCode.EMAIL_ALREADY_VERIFIED,
    });
  }

  const newVerificationCode = generateVerificationCode();
  const newExpiresAt = addMinutes(new Date(), 15);

  const newUser = await authServices.renewVerificationCode(
    user.id,
    newVerificationCode,
    newExpiresAt
  );

  logger.info('✅ New verification code generated', { userId: newUser.id });

  const html = getVerificationEmailHtml(newVerificationCode, lang);
  await sendEmail(newUser.email, 'Email Verification', html);
  logger.info('✅ Verification email resent', { userId: newUser.id, email });

  res.status(200).json({
    message: 'Verification email resent. Please check your inbox.',
    code: SuccessCode.EMAIL_RESEND_SUCCESS,
  });
};

const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    logger.warn('❌ Unauthorized access to get current user');
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const fullProfile = await userServices.findFullUserById(req.user.id);

  return res.json({
    status: 'success',
    message: 'User data retrieved',
    code: SuccessCode.USER_DATA_RETRIEVED,
    user: sanitizeUser(fullProfile),
  });
};

const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isProd = process.env.NODE_ENV === 'production';
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    logger.warn('❌ Refresh token missing');
    return next(
      httpError(
        401,
        'Refresh token required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID
      )
    );
  }

  const decoded = verifyToken(refreshToken, 'refresh');

  const storedToken = await authServices.findRefreshToken(
    decoded.userId,
    refreshToken
  );

  if (!storedToken) {
    logger.warn('❌ Refresh token not found in DB', {
      userId: decoded.userId,
    });
    return next(
      httpError(401, 'Token not found', ErrorCode.AUTH_REFRESH_TOKEN_INVALID)
    );
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    return next(
      httpError(
        401,
        'Refresh token expired',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID
      )
    );
  }

  // 2.  Logic of Grace condition for revoked tokens to handle race conditions
  if (storedToken.revoked) {
    const GRACE_PERIOD_MS = 15000; // 15 sseconds
    const timeSinceRevoked =
      Date.now() - new Date(storedToken.updatedAt).getTime();

    if (timeSinceRevoked < GRACE_PERIOD_MS) {
      logger.info('ℹ️ Race condition handled: token recently rotated', {
        userId: decoded.userId,
      });
      return res.status(200).json({
        message: 'Tokens already refreshed',
        code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
      });
    }
    logger.error('⚠️ Token reuse detected! Potential attack.', {
      userId: decoded.userId,
    });
    return next(
      httpError(
        401,
        'Invalid or expired refresh token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID
      )
    );
  }

  const user = await userServices.findFullUserById(decoded.userId);
  if (!user) {
    return next(httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND));
  }
  // CHECKING FOR BANS VIA A DEDICATED SERVICE
  const isUnbanned = await authServices.checkAndReleaseBan(
    user.id,
    user.status as string,
    user.banType as string,
    user.banExpiresAt
  );

  if (!isUnbanned) {
    logger.warn('❌ Banned user tried to refresh tokens', { userId: user.id, banType: user.banType });

    // Очищаємо куки, бо сесія більше не дійсна
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Віддаємо таку ж структуру відповіді для UI
    return res.status(403).json({
      message: 'Access denied. Account suspended.',
      code: ErrorCode.USER_WAS_BANNED,
      bannedUser: {
        accountId: user.id,
        suspendedOn: user.createdAt,
        suspensionType: user.banType,
        reason: user.banReason || 'Access restricted due to a community guidelines violation',
        banExpiresAt: user.banExpiresAt
      }
    });
  }

  const now = new Date();
  const newRefreshToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'refresh'
  );
  const newRefreshExpiresAt = addDays(now, 30);

  await authServices.updateRefreshToken({
    tokenId: storedToken.id,
    newToken: newRefreshToken,
    newExpiresAt: newRefreshExpiresAt,
    userId: user.id,
  });

  const newAccessToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'access'
  );

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: newRefreshExpiresAt.getTime() - Date.now(),
  });

  logger.info('✅ Tokens refreshed successfully', { userId: user.id });

  return res.status(200).json({
    message: 'Tokens refreshed successfully',
    code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
  });
};

const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const lang = (req.query.lang as string) || 'en';

  const user = await authServices.findUserByEmail(email);
  if (!user) {
    logger.warn('❌ Password reset requested for non-existent email', {
      email,
    });
    return next(httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND));
  }

  await sendResetPasswordEmail(user, lang);

  res.status(200).json({
    message: 'Reset password email sent, check your inbox',
    code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
  });
};

const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { password } = req.body;
  const resetPasswordToken = req.params.resetPasswordToken;

  if (!resetPasswordToken || resetPasswordToken.trim() === '') {
    logger.warn('❌ Password reset failed: missing reset token');
    return next(
      httpError(
        400,
        'Reset token is required',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID
      )
    );
  }

  const user =
    await authServices.findUserByResetPasswordToken(resetPasswordToken);
  if (!user) {
    logger.warn('❌ Password reset failed: invalid reset code', {
      resetPasswordToken,
    });
    return next(
      httpError(
        400,
        'Invalid reset code',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID
      )
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await authServices.updateUserPassword(user.id, hashedPassword);
  logger.info('✅ User password reset successfully', { userId: user.id });

  res.status(200).json({
    message: 'Password has been reset successfully',
    code: SuccessCode.PASSWORD_CHANGED,
  });
};

const resendResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const queryLang = req.query.lang;
  const lang: Lang = isLang(queryLang) ? queryLang : 'en';

  const user = await authServices.findUserByEmail(email);
  if (!user) {
    logger.warn('❌ Resend reset password requested for non-existent email', {
      email,
    });
    return next(httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND));
  }

  await sendResetPasswordEmail(user, lang);

  res.status(200).json({
    message: 'Reset password email resent, check your inbox',
    code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
  });
};

export const controllers = {
  registerUser: asyncHandler(registerUser),
  logIn: asyncHandler(logIn),
  logOut: asyncHandler(logOut),
  verifyEmail: asyncHandler(verifyEmail),
  resendVerificationEmail: asyncHandler(resendVerificationEmail),
  getCurrentUser: asyncHandler(getCurrentUser),
  refreshTokenController: asyncHandler(refreshTokenController),
  forgotPassword: asyncHandler(forgotPassword),
  resetPassword: asyncHandler(resetPassword),
  resendResetPassword: asyncHandler(resendResetPassword),
};
