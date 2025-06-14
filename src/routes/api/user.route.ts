import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '@/controllers/userProfile.controller';
import { validateBody } from '@/middlewares/validateBody.middleware';
import { validateIdParam } from '@/middlewares/validateId.middleware';
import { updateProfileSchema } from '@/schemas/user.schema';

export const userRoute = Router();

userRoute.get('/profile/:id', validateIdParam, getUserProfile);
userRoute.put(
    '/profile/:id',
    validateIdParam,
    validateBody(updateProfileSchema),
    updateUserProfile
);
