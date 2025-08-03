import { prisma } from '@/lib/prisma';
import { CreateContactInput } from '@/schemas/contact.schema';


export const createContactService = async (data: CreateContactInput) => {
    return await prisma.contact.create({
        data,
    });
};