import { Request, Response } from 'express';
import { createContactService } from '@/services/contact.service';
import { asyncHandler } from '@/decorators/asyncHandler';
import logger from '@/utils/logger';

export const createContactController = async (req: Request, res: Response) => {
    const contact = await createContactService(req.body);

    logger.info('Contact form submitted', { contact });

    return res.status(201).json({
        status: 'success',
        message: 'Your message was sent successfully!',
        data: contact,
    });
};



export const contactControllers = {
    createContactController: asyncHandler(createContactController),
};
