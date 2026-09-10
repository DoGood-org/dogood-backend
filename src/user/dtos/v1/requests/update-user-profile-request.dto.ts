import { Gender } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateUserProfileV1 } from 'src/user/interfaces/v1/user';

/**
 * NOTE: one-to-one port of develop:src/schemas/user.schema.ts:3 `updateUserProfileSchema`,
 * including `stripeCustomerId` and an `avatar` that accepts an empty string.
 */
export const updateUserProfileRequestSchemaV1 = z.object({
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
    .union([z.url('Avatar must be a valid URL'), z.literal('')])
    .optional()
    .nullable(),

  location: z
    .object({
      country: z.string().min(2, 'Country is too short').optional().nullable(),
      region: z.string().min(2, 'Region is too short').optional().nullable(),
      city: z.string().min(2, 'City is too short').optional().nullable(),
    })
    .optional()
    .nullable(),

  gender: z.enum(Gender).optional().nullable(),

  birthDate: z.coerce
    .date({ error: 'Invalid date format' })
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

export class UpdateUserProfileRequestDtoV1
  extends createZodDto(updateUserProfileRequestSchemaV1)
  implements UpdateUserProfileV1 {}
