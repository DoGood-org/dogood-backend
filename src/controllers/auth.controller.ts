import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { addDays, addMinutes } from 'date-fns';
import { generateToken } from '@/utils/generateToken';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  cleanupExpiredRefreshTokensService,
  createUserService,
  deleteUserRefreshTokensService,
  findRefreshTokenService,
  findUserByEmailService,
  findUserByIdService,
  findUserByResetPasswordTokenService,
  findUserByVerificationCodeService,
  renewVerificationCodeService,
  saveRefreshTokenService,
  updateRefreshTokenService,
  updateUserEmailVerifiedService,
  updateUserPasswordService,
} from '@/services/auth.service';
import { comparePasswords } from '@/utils/comparePasswords';
import { generateVerificationCode } from '@/utils/generateVerificationCode';
import { getVerificationEmailHtml } from '@/emails/verificationEmail';
import { sendEmail } from '@/utils/sendEmail';
import { asyncHandler } from '@/decorators/asyncHandler';
import { verifyToken } from '@/utils/verifyToken';
import { parseExpirationToSeconds } from '@/utils/parseExpiration';
import { deleteCache, setCache } from '@/utils/cache';
import { sendResetPasswordEmail } from '@/utils/sendResetPasswordEmail';

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password } = req.body;
  const lang = (req.query.lang as string) || 'en';

  const existingUser = await findUserByEmailService(email);
  if (existingUser) {
    logger.warn('User already exists during sign up', { email });
    return next(httpError(409, 'User already exists'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailVerificationCode = generateVerificationCode();
  const emailVerificationExpiresAt = addMinutes(new Date(), 10);

  const newUser = await createUserService({
    name,
    email,
    password: hashedPassword,
    emailVerificationCode,
    emailVerificationExpiresAt,
    lang,
  });

  const html = getVerificationEmailHtml(emailVerificationCode, lang);
  await sendEmail(newUser.email, 'Email Verification', html);

  logger.info('Verification email sent', { userId: newUser.id, email });
  res.status(201).json({
    status: 'success',
    message: 'User created. Please check your email to verify.',
  });
};

const logIn = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await findUserByEmailService(email);
  if (!user) {
    logger.warn('User not found during login', { email });
    return next(httpError(400, 'Invalid email or password'));
  }
  if (!user.isEmailVerified) {
    logger.warn('Email not verified during login', { userId: user.id });
    return next(httpError(403, 'Please verify your email'));
  }

  const isMatch = await comparePasswords(password, user.password);
  if (!isMatch) {
    logger.warn('Invalid password during login', { userId: user.id });
    return next(httpError(400, 'Invalid email or password'));
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
  logger.info('Tokens generated during login', { userId: user.id });

  await saveRefreshTokenService(
    user.id,
    refreshToken,
    addMinutes(new Date(), 43200)
  );
  logger.info('Refresh token saved to database', { userId: user.id });

  const refreshKey = `refreshToken:${user.id}`;
  const ttlSeconds = parseExpirationToSeconds(
    process.env.JWT_REFRESH_EXPIRATION || '30d'
  );

  await setCache<string>(refreshKey, refreshToken, ttlSeconds);
  logger.info('Refresh token stored in Redis', { userId: user.id });

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

  logger.info('User logged in successfully', { userId: user.id });

  // Remove expired tokens periodically
  await cleanupExpiredRefreshTokensService(user.id);

  res.json({
    status: 'success',
    message: 'User logged in successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.profile?.avatar || null,
      siteRole: user.siteRole,
      settings: userSettings,
    },
  });
};

const logOut = async (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';

  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return next(httpError(400, 'No refresh token provided'));
  }

  const decoded = verifyToken(refreshToken, 'refresh');

  const refreshKey = `refreshToken:${decoded.userId}`;
  await deleteCache(refreshKey);
  logger.info('Refresh token deleted from Redis', { userId: decoded.userId });

  await deleteUserRefreshTokensService(decoded.userId);
  logger.info('Refresh tokens deleted from database', {
    userId: decoded.userId,
  });

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });

  logger.info('User logged out');

  res.status(204).json({
    status: 'success',
    message: 'User successfully logged out',
  });
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { verificationCode } = req.params;

  const user = await findUserByVerificationCodeService(verificationCode);

  if (!user) {
    logger.warn('Email verification failed: invalid code', {
      verificationCode,
    });
    return next(httpError(400, 'Invalid verification code'));
  }

  if (user.isEmailVerified) {
    logger.info('Email already verified', { userId: user.id });
    return res.status(200).json({
      status: 'success',
      message: 'Email already verified',
    });
  }

  if (
    user.emailVerificationExpiresAt &&
    user.emailVerificationExpiresAt < new Date()
  ) {
    logger.warn('Email verification failed: verification code expired', {
      userId: user.id,
      verificationCode,
    });
    return next(httpError(400, 'Verification code expired'));
  }

  const verifiedUser = await updateUserEmailVerifiedService(user.id);
  logger.info('Email verification successful', { userId: verifiedUser.id });

  res.status(200).json({
    status: 'success',
    message: 'Email successfully verified',
  });
};

const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const lang = (req.query.lang as string) || 'en';

  const user = await findUserByEmailService(email);
  if (!user) {
    logger.warn('Resend verification requested for non-existent email', {
      email,
    });
    return next(httpError(404, 'User not found'));
  }

  if (user.isEmailVerified) {
    logger.info('Resend verification requested for already verified email', {
      userId: user.id,
    });
    return res.status(200).json({
      status: 'success',
      message: 'Email already verified',
    });
  }

  const newVerificationCode = generateVerificationCode();
  const newExpiresAt = addMinutes(new Date(), 15);

  const newUser = await renewVerificationCodeService(
    user.id,
    newVerificationCode,
    newExpiresAt
  );

  logger.info('New verification code generated', { userId: newUser.id });

  const html = getVerificationEmailHtml(newVerificationCode, lang);
  await sendEmail(newUser.email, 'Email Verification', html);
  logger.info('Verification email resent', { userId: newUser.id, email });

  res.status(200).json({
    status: 'success',
    message: 'Verification email resent. Please check your inbox.',
  });
};

const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Unauthorized'));
  }

  return res.json({
    status: 'success',
    message: 'User data retrieved',
    user: req.user,
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
    logger.warn('Refresh token missing');
    return next(httpError(401, 'Refresh token required'));
  }

  const decoded = verifyToken(refreshToken, 'refresh');

  const storedToken = await findRefreshTokenService(
    decoded.userId,
    refreshToken
  );

  if (!storedToken) {
    logger.warn('Refresh token invalid or revoked', {
      userId: decoded.userId,
    });
    return next(httpError(403, 'Invalid refresh token'));
  }

  const user = await findUserByIdService(decoded.userId);
  if (!user) {
    logger.warn('User not found during token refresh', {
      userId: decoded.userId,
    });
    return next(httpError(404, 'User not found'));
  }

  const now = new Date();
  let newRefreshToken = refreshToken;
  let newRefreshExpiresAt = storedToken.expiresAt;
  let rotated = false;

  // Rotate token only if expired
  if (storedToken.expiresAt <= now) {
    newRefreshToken = generateToken(
      { userId: user.id, siteRole: user.siteRole },
      'refresh'
    );
    newRefreshExpiresAt = addDays(now, 30);

    const createdToken = await updateRefreshTokenService({
      tokenId: storedToken.id,
      newToken: newRefreshToken,
      newExpiresAt: newRefreshExpiresAt,
      userId: user.id,
    });

    rotated = true;
    logger.info('Refresh token rotated due to expiration', {
      userId: user.id,
      oldTokenId: storedToken.id,
      newTokenId: createdToken.id,
    });
  }

  const newAccessToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'access'
  );

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 хв
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: newRefreshExpiresAt.getTime() - Date.now(),
  });

  logger.info('Access (and refresh if rotated) token sent', {
    userId: user.id,
    rotated,
  });

  res.status(200).json({
    status: 'success',
    message: 'Tokens refreshed successfully',
  });
};

const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const lang = (req.query.lang as string) || 'en';

  const user = await findUserByEmailService(email);
  if (!user) {
    logger.warn('Password reset requested for non-existent email', { email });
    return next(httpError(404, 'User not found'));
  }

  await sendResetPasswordEmail(user, lang);

  res.status(200).json({
    status: 'success',
    message: 'Reset password email sent, check your inbox',
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
    logger.warn('Password reset failed: missing reset token');
    return next(httpError(400, 'Reset token is required'));
  }

  const user = await findUserByResetPasswordTokenService(resetPasswordToken);
  if (!user) {
    logger.warn('Password reset failed: invalid reset code', {
      resetPasswordToken,
    });
    return next(httpError(400, 'Invalid reset code'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await updateUserPasswordService(user.id, hashedPassword);
  logger.info('User password reset successfully', { userId: user.id });

  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully',
  });
};

const resendResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;
  const lang = (req.query.lang as string) || 'en';

  const user = await findUserByEmailService(email);
  if (!user) {
    logger.warn('Resend reset password requested for non-existent email', {
      email,
    });
    return next(httpError(404, 'User not found'));
  }

  await sendResetPasswordEmail(user, lang);

  res.status(200).json({
    status: 'success',
    message: 'Reset password email resent, check your inbox',
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
