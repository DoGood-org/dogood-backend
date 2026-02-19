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

supportRoute.get(
    '/',
    supportController.getAllSupport
);

supportRoute.get(
    '/:id',
    supportController.getSupportById
);

// TODO: reply to support message
// supportRoute.patch('/:id/reply', supportController.replyToSupport);
