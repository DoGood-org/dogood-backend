import { Router } from 'express';
import { validateBody } from '@/middlewares/validateBody.middleware';
import { schemas } from '@/schemas/user.schema';
import { authenticateUser } from '@/middlewares';
import { controllers } from '@/controllers/userProfile.controller';

export const userRoute = Router();

userRoute.put(
  '/profile',
  authenticateUser,
  validateBody(schemas.updateUserProfileSchema),
  controllers.updateProfileController
);

userRoute.put(
  '/settings',
  authenticateUser,
  controllers.updateUserSettingsController
);

userRoute.delete(
  '/profile',
  authenticateUser,
  controllers.deleteUserController
);