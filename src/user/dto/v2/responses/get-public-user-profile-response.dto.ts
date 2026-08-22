import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PublicUserProfileV2 } from 'src/user/interfaces/v2/user-profile';
import { locationSchema } from 'src/user/dto/v2/generic/location.dto';
import { publicUserProfileDetailsSchema } from 'src/user/dto/v2/generic/user-profile-details.dto';

export const getPublicUserProfileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  profile: publicUserProfileDetailsSchema.nullable(),
  location: locationSchema.nullable(),
});

export class GetPublicUserProfileResponseV2Dto
  extends createZodDto(getPublicUserProfileResponseSchema)
  implements PublicUserProfileV2 {}
