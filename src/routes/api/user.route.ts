import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '@/controllers/userProfile.controller';
import { validateBody } from '@/middlewares/validateBody.middleware';
import { validateIdParam } from '@/middlewares/validateId.middleware';
import { updateProfileSchema } from '@/schemas/user.schema';

const router = Router();

router.get('/profile/:id', validateIdParam, getUserProfile);
router.put('/profile/:id', validateIdParam, validateBody(updateProfileSchema), updateUserProfile);

export default router;
