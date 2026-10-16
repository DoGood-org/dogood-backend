import { Gender } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateUserProfileDataV1 } from 'src/user/interfaces/user';

// NOTE: legacy `updateUserProfileSchema` verbatim.
const updateUserProfileRequestSchemaV1 = z.object({
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
    .url('Avatar must be a valid URL')
    .or(z.literal(''))
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
    .date('Invalid date format')
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
  implements UpdateUserProfileDataV1 {}
