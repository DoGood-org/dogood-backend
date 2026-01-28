import { z } from 'zod';

export const createSupportMessageSchema = z.object({
    email: z.string().email(),
    subject: z.string().min(3).max(100),
    message: z.string().min(10),
});

export type CreateSupportMessageInput = z.infer<
    typeof createSupportMessageSchema
>;

export const supportSchemas = {
    createSupportMessageSchema,
};
