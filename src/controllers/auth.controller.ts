import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { loginSchema, signUpSchema } from '@/utils/validation';
import { generateToken } from '@/utils/generateToken';
import { prisma } from '@/lib/prisma';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';

export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = signUpSchema.validate(req.body);

    if (error) {
      logger.warn('Sign up validation failed', { errors: error.details });
      return res.status(400).json({ message: 'Validation failed', details: error.details });
    }

    const { name, email, password } = value;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn('User already exists during sign up', { email });
      return next(httpError(409, 'User already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        siteRole: 'USER',
      },
    });

    logger.info('User created successfully', { userId: newUser.id, email });

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
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
    logger.warn('Login validation failed', { errors: error.details });
    return res.status(400).json({ message: 'Validation failed', details: error.details });
    }
    const { email, password } = value;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn('Login failed: user not found', { email });
      return next(httpError(400, 'Invalid email or password'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login failed: incorrect password', { email });
      return next(httpError(400, 'Invalid email or password'));
    }

    logger.info('User logged in successfully', { userId: user.id, email });

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