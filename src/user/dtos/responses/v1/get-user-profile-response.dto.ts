import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  fullUserSchemaV1,
  publicUserSchemaV1,
} from 'src/user/dtos/generic/v1/user.dto';
import {
  FullUserV1,
  PublicUserV1,
  UserResponseV1,
} from 'src/user/interfaces/user';

const getUserProfileResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_PROFILE_RETRIEVED),
  data: z.object({ user: fullUserSchemaV1 }),
});

const getPublicUserProfileResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_PROFILE_RETRIEVED),
  data: z.object({ user: publicUserSchemaV1 }),
});

export class GetUserProfileResponseDtoV1
  extends createZodDto(getUserProfileResponseSchemaV1)
  implements JsonSerialized<UserResponseV1<{ user: FullUserV1 }>> {}

export class GetPublicUserProfileResponseDtoV1
  extends createZodDto(getPublicUserProfileResponseSchemaV1)
  implements JsonSerialized<UserResponseV1<{ user: PublicUserV1 }>> {}
