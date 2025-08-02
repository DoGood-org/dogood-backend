import { Router } from 'express';
import { validateBody } from '@/middlewares/validateBody.middleware';
import { createContactSchema } from '@/schemas/contact.schema';
import { contactControllers } from '@/controllers/contact.controller';

const router = Router();

router.post('/', validateBody(createContactSchema), contactControllers.createContactController);

export const contactRoute = router;
