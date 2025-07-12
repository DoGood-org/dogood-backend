import { z } from 'zod';

export const signUpSchema = z.object({
  name: z
    .string()
    .min(4, { message: 'Name must be at least 4 characters' })
    .max(30, { message: 'Name must be more than 30 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});
