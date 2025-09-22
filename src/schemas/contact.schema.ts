import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number'),
  email: z.string().email('Invalid email'),
  message: z.string().min(1, 'Message is required'),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
