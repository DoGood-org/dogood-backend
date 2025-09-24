import { z } from 'zod';

const signUpSchema = z.object({
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(3, { message: 'Name must be at least 3 characters' })
    .max(30, { message: 'Name must be at most 30 characters' }),

  email: z
    .string({
      required_error: 'Email is required',
    })
    .email({ message: 'Invalid email address' }),

  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, { message: 'Password must be at least 6 characters' }),
});

const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email({ message: 'Invalid email address' }),

  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, { message: 'Password must be at least 6 characters' }),
});

const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email({ message: 'Invalid email address' }),
});

const resetPasswordSchema = z.object({
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, { message: 'Password must be at least 6 characters' }),
});

export const Schemas = {
  signUpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
