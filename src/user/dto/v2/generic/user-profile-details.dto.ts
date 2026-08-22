import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Gender } from '@prisma/client';
import { UserProfileDetailsV2 } from 'src/user/interfaces/v2/user-profile';

export const userProfileDetailsSchema = z.object({
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  gender: z.enum(Gender).nullable(),
  birthDate: z.date().nullable(),
  phoneNumber: z.string().nullable(),
});

/** Публічна підмножина — те, що віддається стороннім користувачам. */
export const publicUserProfileDetailsSchema = userProfileDetailsSchema.pick({
  bio: true,
  avatar: true,
  gender: true,
});

export class UserProfileDetailsV2Dto
  extends createZodDto(userProfileDetailsSchema)
  implements UserProfileDetailsV2 {}
