import { prisma } from '@/config/prisma';
import { httpError } from '@/helpers/httpError';
import { ErrorCode } from '@/constants/apiCodes';
import logger from '@/utils/logger';
import type { CreateSupportMessageInput } from '@/schemas/support.schema';

const createSupportMessage = async (
    data: CreateSupportMessageInput
) => {
    try {
        const message = await prisma.supportMessage.create({
            data,
        });

        logger.info('✅ Support message created', {
            id: message.id,
            email: message.email,
        });

        return message;
    } catch (error) {
        logger.error('❌ Failed to create support message', {
            error,
            data,
        });

        throw httpError(
            500,
            'Failed to create support message',
            ErrorCode.SUPPORT_MESSAGE_CREATION_FAILED
        );
    }
};

export const supportService = {
    createSupportMessage,
};
