import express from 'express';
import { validateBody } from '@/middlewares';
import { logIn, logOut, signUp } from '@/controllers/auth.controller';
import { loginSchema, signUpSchema } from '@/schemas/auth.schema';

export const authRoute = express.Router();

authRoute.post('/signup', validateBody(signUpSchema), signUp);
// ! update: Додати аутентифікацію для логіну authenticateUser
authRoute.post('/login', validateBody(loginSchema), logIn);

authRoute.post('/logout', logOut);
// ! add: додати роут для верифікації email
