import { Router } from 'express';
import { validateBody } from '@/middlewares/validateBody.middleware';
import { schemas } from '@/schemas/user.schema';
import { authenticateUser } from '@/middlewares';
import { controllers } from '@/controllers/userProfile.controller';

export const userRoute = Router();


userRoute.get('/profile/:id', controllers.getUserById);

userRoute.put(
  '/profile',
  authenticateUser,
  validateBody(schemas.updateUserProfileSchema),
  controllers.updateProfile
);

userRoute.put(
  '/settings',
  authenticateUser,
  controllers.updateUserSettings
);

userRoute.delete(
  '/profile',
  authenticateUser,
  controllers.deleteUser
);

userRoute.post(
  '/name',
  authenticateUser,
  validateBody(schemas.getUserNameSchema),
  controllers.getUsersName);