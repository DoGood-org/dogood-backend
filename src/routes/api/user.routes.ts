import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/user.controller';

const router = Router();

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
