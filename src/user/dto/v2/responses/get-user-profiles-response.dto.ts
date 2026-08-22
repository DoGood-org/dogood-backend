import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserV2 } from 'src/user/interfaces/v2/get-user-profiles';

export const getUserProfilesResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

export class GetUserProfilesResponseV2Dto
  extends createZodDto(getUserProfilesResponseSchema)
  implements UserV2 {}
