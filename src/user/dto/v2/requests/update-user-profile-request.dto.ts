import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Gender } from '@prisma/client';
import { UpdateUserProfileV2 } from 'src/user/interfaces/v2/update-user-profile';

export const updateUserProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    bio: z.string().max(1000).nullable().optional(),
    avatar: z.string().url().nullable().optional(),
    gender: z.enum(Gender).optional(),
    birthDate: z.coerce.date().optional(),
    phoneNumber: z.string().min(5).max(20).optional(),
    location: z
      .object({
        country: z.string().min(1).max(100).optional(),
        region: z.string().min(1).max(100).optional(),
        city: z.string().min(1).max(100).optional(),
      })
      .nullable()
      .optional(),
  })
  .strict();

export class UpdateUserProfileRequestV2Dto
  extends createZodDto(updateUserProfileSchema)
  implements UpdateUserProfileV2 {}
