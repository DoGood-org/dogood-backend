import { Request, Response, NextFunction } from 'express';
import { createContactService } from '@/services/contact.service';
import { asyncHandler } from '@/decorators/asyncHandler';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { SuccessCode, ErrorCode } from '@/constants/apiCodes';

const createContactController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const contact = await createContactService(req.body);

        logger.info('Contact form submitted', { contactId: contact.id });

        res.status(201).json({
            status: 'success',
            code: SuccessCode.CONTACT_CREATED,
            message: 'Your message was sent successfully!',
            data: contact,
        });

    } catch (error) {
        logger.error('Failed to submit contact form', { error });
        return next(
            httpError(500, 'Failed to submit contact form', ErrorCode.CONTACT_CREATION_FAILED)
        );
    }
};

export const contactControllers = {
    createContactController: asyncHandler(createContactController),
};
