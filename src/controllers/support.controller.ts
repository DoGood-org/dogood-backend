import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import { supportService } from '@/services/support.service';
import { SuccessCode, ErrorCode } from '@/constants/apiCodes';
import { httpError } from '@/helpers/httpError';


const sendSupportMessage = async (
    req: Request,
    res: Response
) => {
    const supportMessage =
        await supportService.createSupportMessage(req.body);

    if (!supportMessage) {
        throw httpError(
            500,
            'Failed to create support message',
            ErrorCode.SUPPORT_MESSAGE_CREATION_FAILED
        );
    }

    res.status(201).json({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGE_CREATED,
        data: supportMessage,
    });
};


const getSupportById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
        throw httpError(
            400,
            'Invalid support message id',
            ErrorCode.INVALID_SUPPORT_MESSAGE_ID
        );
    }

    const message = await supportService.getSupportMessageById(id);

    if (!message) {
        throw httpError(
            404,
            'Support message not found',
            ErrorCode.SUPPORT_MESSAGE_NOT_FOUND
        );
    }

    res.status(200).json({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGE_FETCHED,
        data: message,
    });
};


const getAllSupport = async (_: Request, res: Response) => {
    const messages = await supportService.getAllSupportMessages();

    res.status(200).json({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGES_FETCHED,
        data: messages,
    });
};


export const supportController = {
    sendSupportMessage: asyncHandler(sendSupportMessage),
    getSupportById: asyncHandler(getSupportById),
    getAllSupport: asyncHandler(getAllSupport),
};


// TODO: reply to support message
// const replyToSupport = async (req: Request, res: Response) => {
//     // 1. find message
//     // 2. update status
//     // 3. send to user
// };
