import { Request, Response, NextFunction } from 'express';

import { generateToken } from '@/utils/generateToken';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  createUserService,
  findUserByEmailService,
} from '@/services/auth.service';
import { comparePasswords } from '@/utils/comparePasswords';
import { BASE_URL, NODE_ENV } from '@/config/env';
// import sendMail from '@/utils/sendEmail'; // Uncomment when sendMail is implemented

// ! update:  прирати логіку поврення данних юзер, повертати лише message: 'Registration successful. Please verify your email.'
export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmailService(email);
    if (existingUser) {
      logger.warn('User already exists during sign up', { email });
      return next(httpError(409, 'User already exists'));
    }

  //! update model: додати зберігання коду верифікації в бд в юзері.
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const newUser = await createUserService({ name, email, password });

    const baseUrl = BASE_URL;
// ! fixme:  винести в окрему папку з мейлами
    const data = {
      to: email,
      subject: 'Confirm your registration in DoGood',
      text: 'Press on the link to confirm your email',
      html: ` Please click on the following link to confirm your account in DoGood. <a href="${baseUrl}/auth/verify/${verificationCode}" target="_blank" rel="noopener noreferrer">Confirm my mail</a>`,
    };

    logger.info('Sending verification email', { data });

    // Uncomment the line below to send the email
    // Add all nessesary to the sendMail function overall has to flight

    // sendMail(data);
    res.json({
      status: 201,
      message: 'User successfully registered',
      data: {
        username: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    logger.error('Sign up failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

export const logIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    logger.error('Login failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

export const logOut = (req: Request, res: Response) => {
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

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { verificationCode } = req.params;

    //  Uncomment when you have a verification service
    // const isValid = await verifyEmailService(verificationCode);
    // if (!isValid) {
    //   logger.warn('Email verification failed: invalid code', { verificationCode });
    //   return next(httpError(400, 'Invalid verification code'));
    // }

    logger.info('Email verification successful', { verificationCode });
    res.status(200).json({ message: 'Email successfully verified' });
  } catch (error) {
    logger.error('Email verification failed', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};
