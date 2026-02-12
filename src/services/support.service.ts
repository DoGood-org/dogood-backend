import { prisma } from '@/config/prisma';
import type { CreateSupportMessageInput } from '@/schemas/support.schema';

const createSupportMessage = async (
    data: CreateSupportMessageInput
) => {
    const message = await prisma.supportMessage.create({
        data,
    });

    return message;
};

const getSupportMessageById = async (id: number) => {
    return prisma.supportMessage.findUnique({
        where: { id },
    });
};

const getAllSupportMessages = async () => {
    return prisma.supportMessage.findMany({
        orderBy: { createdAt: 'desc' },
    });
};

export const supportService = {
    createSupportMessage,
    getSupportMessageById,
    getAllSupportMessages,
};
