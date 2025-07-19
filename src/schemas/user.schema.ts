import { z } from 'zod';

const updateUserProfileSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'Name must be a string',
    })
    .min(1, 'Name cannot be empty')
  .optional(),

  bio: z
    .string({
      invalid_type_error: 'Bio must be a string',
    })
    .max(500, 'Bio cannot exceed 500 characters')
    .optional()
    .nullable(),

  avatar: z
    .string({
      invalid_type_error: 'Avatar must be a valid URL string',
    })
    .url('Avatar must be a valid URL')
    .optional()
    .nullable(),

  location: z
    .object({
      country: z.string({
        required_error: 'Country is required',
      }),
      region: z.string({
        required_error: 'Region is required',
      }),
      city: z.string({
        required_error: 'City is required',
      }),
    })
    .optional()
    .nullable(),

  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'], {
      required_error: 'Gender is required',
      invalid_type_error: 'Gender must be one of MALE, FEMALE, or OTHER',
    })
    .optional()
    .nullable(),

  birthDate: z.coerce
    .date({
      invalid_type_error: 'Birth date must be a valid date',
    })
    .optional()
    .nullable(),

  phoneNumber: z
    .string({
      invalid_type_error: 'Phone number must be a string',
    })
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),

  paymentOptionIds: z
    .array(
      z
        .number({
          invalid_type_error: 'Each payment option ID must be a number',
        })
        .int('Payment option ID must be an integer')
        .positive('Payment option ID must be positive')
    )
    .optional(),
});

export const updateUserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().min(2).max(5).optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export const schemas = { updateUserProfileSchema, updateUserSettingsSchema };
