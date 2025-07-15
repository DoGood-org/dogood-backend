import { z } from 'zod';

const signUpSchema = z.object({
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(4, { message: 'Name must be at least 4 characters' })
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

const companySignUpSchema = z.object({
  name: z
    .string({
      required_error: 'Name is required',
    })
    .min(4, { message: 'Name must be at least 4 characters' })
    .max(30, { message: 'Name must be less than 30 characters' }),

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

  organizationName: z
    .string({
      required_error: 'Organization name is required',
    })
    .min(2, { message: 'Organization name must be at least 2 characters' })
    .max(50, { message: 'Organization name must be less than 50 characters' }),
});

export const Schemas = {
  signUpSchema,
  loginSchema,
  companySignUpSchema,
};
