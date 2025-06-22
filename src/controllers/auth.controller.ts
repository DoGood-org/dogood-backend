import { Request, Response, NextFunction } from 'express';

import { generateToken } from '@/utils/generateToken';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  createUserService,
  findUserByEmailService,
} from '@/services/auth.service';
import { comparePasswords } from '@/utils/comparePasswords';

export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmailService(email);
    if (existingUser) {
      logger.warn('User already exists during sign up', { email });
      return next(httpError(409, 'User already exists'));
    }

    const newUser = await createUserService({ name, email, password });

    generateToken({ userId: newUser.id, siteRole: newUser.siteRole }, res);

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      siteRole: newUser.siteRole,
    });
  } catch (error) {
    logger.error('Sign up failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

export const logIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    generateToken({ userId: user.id, siteRole: user.siteRole }, res);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      siteRole: user.siteRole,
    });
  } catch (error) {
    logger.error('Login failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

export const logOut = (req: Request, res: Response) => {
  res.clearCookie('jwt');
  logger.info('User logged out');
  res.status(200).json({ message: 'Logged out successfully' });
};

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Auth check success', { userId: req.user?.id });
    res.status(200).json(req.user);
  } catch (error) {
    logger.error('Auth check failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};