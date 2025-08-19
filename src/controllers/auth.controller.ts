import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { addMinutes } from 'date-fns';
import { generateToken } from '@/utils/generateToken';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  addMemberToOrganizationService,
  createOrganizationService,
  createUserService,
  findOrganizationByNameService,
  findUserByEmailService,
  findUserByIdService,
  findUserByVerificationCodeService,
  getOrganizationMembersService,
  removeMemberFromOrganizationService,
  updateUserEmailVerifiedService,
} from '@/services/auth.service';
import { comparePasswords } from '@/utils/comparePasswords';
import { JWT_REFRESH_EXPIRATION, NODE_ENV } from '@/config/env';
import { generateVerificationCode } from '@/utils/generateVerificationCode';
import { getVerificationEmailHtml } from '@/emails/verificationEmail';
import { sendEmail } from '@/utils/sendEmail';
import { asyncHandler } from '@/decorators/asyncHandler';
import { verifyToken } from '@/utils/verifyToken';
import { parseExpirationToSeconds } from '@/utils/parseExpiration';
import { deleteCache, getCache, setCache } from '@/utils/cache';

const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password } = req.body;

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
  });

  const html = getVerificationEmailHtml(emailVerificationCode);
  await sendEmail(newUser.email, 'Email Verification', html);

  res.status(201).json({
    status: 'success',
    message: 'User created. Please check your email to verify.',
  });
};

const logIn = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await findUserByEmailService(email);
  if (!user) {
    logger.warn('Login failed: user not found', { email });
    return next(httpError(400, 'Invalid email or password'));
  }

  const isMatch = await comparePasswords(password, user.password);
  if (!isMatch) {
    logger.warn('Login failed: incorrect password', { email });
    return next(httpError(400, 'Invalid email or password'));
  }

  const isProd = NODE_ENV === 'production';

  const tokenAuth = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'access'
  );
  logger.info('Token generated for user', { userId: user.id });
  const tokenRefresh = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'refresh'
  );
  logger.info('Refresh token generated for user', { userId: user.id });
  const refreshKey = `refreshToken:${user.id}`;
  const ttlSeconds = parseExpirationToSeconds(JWT_REFRESH_EXPIRATION || '30d');
  await setCache(refreshKey, tokenRefresh, ttlSeconds);
  logger.info('Refresh token stored in Redis', { userId: user.id });

  res.cookie('token', tokenAuth, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });
  logger.info('Access token set in cookies for user', { userId: user.id });
  res.cookie('refreshToken', tokenRefresh, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });
  logger.info('Refresh token set in cookies for user', { userId: user.id });
  res.json({
    status: 'success',
    message: 'User logged in successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      siteRole: user.siteRole,
    },
  });
  logger.info('User logged in', { userId: user.id });
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

  if (user.isEmailVerified) {
    logger.info('Email already verified', { userId: user.id });
    return res.status(200).json({
      status: 'success',
      message: 'Email already verified',
    });
  }

  const verifiedUser = await updateUserEmailVerifiedService(user.id);

  logger.info('Email verification successful', { userId: verifiedUser.id });
  res.status(200).json({
    status: 'success',
    message: 'Email successfully verified',
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

  const userId = req.user.id;
  const cacheKey = 'user' + userId;

  const cachedUser = await getCache<typeof req.user>(cacheKey);
  if (cachedUser) {
    return res.json({
      status: 'success',
      message: 'User data retrieved',
      user: cachedUser,
    });
  }

  await setCache(cacheKey, req.user, 600);

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
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    logger.warn('Refresh token missing');
    return next(httpError(401, 'Refresh token required'));
  }

  const decoded = verifyToken(refreshToken, 'refresh');

  const refreshKey = `refreshToken:${decoded.userId}`;
  const storedToken = await getCache(refreshKey);

  if (!storedToken || storedToken !== refreshToken) {
    logger.warn('Refresh token invalid or expired in Redis', {
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

  if (!user.isEmailVerified) {
    logger.warn('Email not verified during token refresh', {
      userId: user.id,
    });
    return next(httpError(403, 'Please verify your email'));
  }

  const newAccessToken = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'access'
  );

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  logger.info('Access token refreshed', { userId: user.id });

  res.status(200).json({
    status: 'success',
    message: 'Access token refreshed',
  });
};

const registerOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, password, organizationName } = req.body;

  const existingUser = await findUserByEmailService(email);
  if (existingUser) {
    logger.warn('User already exists during company sign up', { email });
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
    siteRole: 'USER',
  });

  const existingOrg = await findOrganizationByNameService(organizationName);
  if (existingOrg) {
    logger.warn('Organization already exists', { organizationName });
    return next(httpError(409, 'Organization with this name already exists'));
  }

  await createOrganizationService({
    userId: newUser.id,
    organizationName,
  });

  const html = getVerificationEmailHtml(emailVerificationCode);
  await sendEmail(newUser.email, 'Email Verification', html);

  res.status(201).json({
    status: 'success',
    message: 'Organization account created. Please verify your email.',
  });
};

const getOrganizationMembersController = async (
  req: Request,
  res: Response
) => {
  const { organizationId } = req.params;

  if (!organizationId) {
    throw httpError(400, 'organizationId parameter is required');
  }

  const members = await getOrganizationMembersService(organizationId);

  res.status(200).json({ members });
};

const addMemberToOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, organizationId, role, status } = req.body;

    if (!userId || !organizationId) {
      return next(httpError(400, 'userId and organizationId are required'));
    }

    const member = await addMemberToOrganizationService({
      userId,
      organizationId,
      role,
      status,
    });

    logger.info('Added member to organization', {
      userId,
      organizationId,
      role,
      status,
    });

    res.status(201).json({ message: 'Member added to organization', member });
  } catch (error) {
    logger.error('Failed to add member to organization', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

const removeMemberFromOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, organizationId } = req.body;

    if (!userId || !organizationId) {
      return next(httpError(400, 'userId and organizationId are required'));
    }

    const result = await removeMemberFromOrganizationService(
      userId,
      organizationId
    );

    if (result.count === 0) {
      return next(httpError(404, 'Member not found in organization'));
    }

    res.status(200).json({ message: 'Member removed from organization' });
  } catch (error) {
    next(error);
  }
};

export const controllers = {
  registerUser: asyncHandler(registerUser),
  logIn: asyncHandler(logIn),
  logOut: asyncHandler(logOut),
  verifyEmail: asyncHandler(verifyEmail),
  getCurrentUser: asyncHandler(getCurrentUser),
  refreshTokenController: asyncHandler(refreshTokenController),
  registerOrganization: asyncHandler(registerOrganization),
  addMemberToOrganizationController: asyncHandler(
    addMemberToOrganizationController
  ),
  getOrganizationMembersController: asyncHandler(
    getOrganizationMembersController
  ),
  removeMemberFromOrganizationController: asyncHandler(
    removeMemberFromOrganizationController
  ),
};
