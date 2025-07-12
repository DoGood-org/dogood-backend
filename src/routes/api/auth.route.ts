import express from 'express';
import { validateBody, verifyToken } from '@/middlewares';
import {
  checkAuth,
  logIn,
  logOut,
  signUp,
} from '@/controllers/auth.controller';
import { loginSchema, signUpSchema } from '@/schemas/auth.schema';

export const authRoute = express.Router();

authRoute.post('/signup', validateBody(signUpSchema), signUp);

authRoute.post('/login', validateBody(loginSchema), logIn);

authRoute.post('/logout', logOut);

authRoute.get('/check', verifyToken, checkAuth);
