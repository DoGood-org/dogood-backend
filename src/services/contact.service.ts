import { prisma } from '@/lib/prisma';
import { CreateContactInput } from '@/schemas/contact.schema';


 const createContact = async (data: CreateContactInput) => {
    return await prisma.contact.create({
        data,
    });
};

export const contactServices = {
    createContact,
}