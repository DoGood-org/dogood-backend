import express from 'express';
import { authenticateUser, validateBody } from '@/middlewares';
import { controllers } from '@/controllers/auth.controller';
import { Schemas } from '@/schemas/auth.schema';
import { rateLimitMiddleware } from '@/middlewares/rateLimit.middleware';

export const authRoute = express.Router();

authRoute.post(
  '/signup',
  validateBody(Schemas.signUpSchema),
  controllers.registerUser
);

authRoute.post('/login', validateBody(Schemas.loginSchema), controllers.logIn);

authRoute.post('/logout', controllers.logOut);

authRoute.get(
  '/verify-email/:verificationCode',
  rateLimitMiddleware({
    keyPrefix: 'verifyEmail',
    windowSeconds: 15 * 60,
    maxRequests: 5,
  }),
  controllers.verifyEmail
);

authRoute.post(
  '/resend-verification',
  rateLimitMiddleware({
    keyPrefix: 'resendVerification',
    windowSeconds: 15 * 60,
    maxRequests: 5,
  }),
  validateBody(Schemas.forgotPasswordSchema),
  controllers.resendVerificationEmail
);

authRoute.get('/current-user', authenticateUser, controllers.getCurrentUser);

authRoute.post(
  '/refresh-token',
  rateLimitMiddleware({
    keyPrefix: 'refresh-token',
    windowSeconds: 60,
    maxRequests: 5,
  }),
  controllers.refreshTokenController
);

authRoute.post(
  '/forgot-password',
  rateLimitMiddleware({
    keyPrefix: 'forgot-password',
    windowSeconds: 60,
    maxRequests: 5,
  }),
  validateBody(Schemas.forgotPasswordSchema),
  controllers.forgotPassword
);

authRoute.post(
  '/reset-password/:resetPasswordToken',
  validateBody(Schemas.resetPasswordSchema),
  controllers.resetPassword
);

authRoute.post(
  '/resent-forgot-password',
  validateBody(Schemas.forgotPasswordSchema),
  controllers.resendResetPassword
);
