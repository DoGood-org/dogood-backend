import { z } from 'zod';

const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name is too long')
    .optional(),

  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional()
    .nullable(),

  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .or(z.literal('')) 
    .optional()
    .nullable(),

  location: z
    .object({
      country: z.string().min(2, 'Country is too short'),
      region: z.string().min(2, 'Region is too short'),
      city: z.string().min(2, 'City is too short'),
    })
    .optional()
    .nullable(),

  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'])
    .optional()
    .nullable(),

  birthDate: z.coerce 
    .date({
      invalid_type_error: 'Invalid date format',
    })
    .refine((date) => date < new Date(), "Birth date can't be in the future")
    .optional()
    .nullable(),

  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),

  stripeCustomerId: z.string().optional().nullable(),
});

export const updateUserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().min(2).max(5).optional(),
});

const getUserNameSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'Name must be a string',
    })
    .min(1, 'Name cannot be empty')
  .optional(),
  })

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export const schemas = { updateUserProfileSchema, updateUserSettingsSchema, getUserNameSchema };
