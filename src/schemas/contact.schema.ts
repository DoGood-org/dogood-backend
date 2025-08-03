import { z } from 'zod';

export const createContactSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    message: z.string().min(1, 'Message is required'),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
