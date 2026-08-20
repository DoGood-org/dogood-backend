import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SiteRole } from '@prisma/client';
import { UserProfileV2 } from 'src/user/interfaces/v2/user-profile';
import { locationSchema } from 'src/user/dto/v2/generic/location.dto';
import { userSettingsSchema } from 'src/user/dto/v2/generic/user-settings.dto';
import { userProfileDetailsSchema } from 'src/user/dto/v2/generic/user-profile-details.dto';

export const getUserProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(SiteRole),
  isEmailVerified: z.boolean(),
  createdAt: z.date(),
  profile: userProfileDetailsSchema.nullable(),
  settings: userSettingsSchema.nullable(),
  location: locationSchema.nullable(),
});

export class GetUserProfileResponseV2Dto
  extends createZodDto(getUserProfileResponseSchema)
  implements UserProfileV2 {}
