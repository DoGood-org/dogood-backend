import { Router } from 'express';
import { validateBody } from '@/middlewares';
import { supportSchemas } from '@/schemas/support.schema';
import { supportController } from '@/controllers/support.controller';

export const supportRoute = Router();

supportRoute.post(
    '/',
    validateBody(supportSchemas.createSupportMessageSchema),
    supportController.sendSupportMessage
);
