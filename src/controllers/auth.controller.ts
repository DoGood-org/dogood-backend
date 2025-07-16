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
import { NODE_ENV } from '@/config/env';
import { generateVerificationCode } from '@/utils/generateVerificationCode';
import { getVerificationEmailHtml } from '@/emails/verificationEmail';
import { sendEmail } from '@/utils/sendEmail';
import { asyncHandler } from '@/decorators/asyncHandler';
import { verifyToken } from '@/utils/verifyToken';

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

  res
    .status(201)
    .json({ message: 'User created. Please check your email to verify.' });
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
  const tokenRefresh = generateToken(
    { userId: user.id, siteRole: user.siteRole },
    'refresh'
  );

  res.cookie('token', tokenAuth, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.cookie('refreshToken', tokenRefresh, {
    httpOnly: true,
    secure: isProd ? true : false,
    sameSite: isProd ? 'none' : 'lax',
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    siteRole: user.siteRole,
  });
};

const logOut = (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';

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
  res.status(204).json({ message: 'User successfully logged out' });
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
    return res.status(200).json({ message: 'Email already verified' });
  }

  const verifiedUser = await updateUserEmailVerifiedService(user.id);

  logger.info('Email verification successful', { userId: verifiedUser.id });
  res.status(200).json({ message: 'Email successfully verified' });
};

const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Unauthorized'));
  }

  const { id, email, name, settings, siteRole, avatar } = req.user;

  res.json({ id, email, name, settings, siteRole, avatar });
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

  res.status(200).json({ message: 'Access token refreshed' });
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

  const newOrganization = await createOrganizationService({
    userId: newUser.id,
    organizationName,
  });

  const html = getVerificationEmailHtml(emailVerificationCode);
  await sendEmail(newUser.email, 'Email Verification', html);

  res.status(201).json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      siteRole: newUser.siteRole,
    },
    organization: {
      id: newOrganization.id,
      name: newOrganization.name,
    },
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
