import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import { supportService } from '@/services/support.service';
import { SuccessCode } from '@/constants/apiCodes';
import type { CreateSupportMessageInput } from '@/schemas/support.schema';

const sendSupportMessage = async (
    req: Request,
    res: Response
) => {
    const supportMessage =
        await supportService.createSupportMessage(
            req.body as CreateSupportMessageInput
        );

    res.status(201).json({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGE_CREATED,
        data: { supportMessage },
    });
};

export const supportController = {
    sendSupportMessage: asyncHandler(sendSupportMessage),
};
