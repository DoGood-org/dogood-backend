import express from 'express';
import { authenticateUser, validateBody } from '@/middlewares';
import { controllers } from '@/controllers/auth.controller';
import { Schemas } from '@/schemas/auth.schema';

export const authRoute = express.Router();

authRoute.post(
  '/signup',
  validateBody(Schemas.signUpSchema),
  controllers.registerUser
);

authRoute.post('/login', validateBody(Schemas.loginSchema), controllers.logIn);

authRoute.post('/logout', controllers.logOut);

authRoute.get('/verify-email/:verificationCode', controllers.verifyEmail);

authRoute.get('/current-user', authenticateUser, controllers.getCurrentUser);

authRoute.post('/refresh-token', controllers.refreshTokenController);

authRoute.post(
  '/signup/organization',
  validateBody(Schemas.companySignUpSchema),
  controllers.registerOrganization
);

authRoute.get(
  '/:organizationId/members',
  controllers.getOrganizationMembersController
);

authRoute.post(
  '/organization/members',
  controllers.addMemberToOrganizationController
);

authRoute.delete(
  '/organization/members',
  controllers.removeMemberFromOrganizationController
);
