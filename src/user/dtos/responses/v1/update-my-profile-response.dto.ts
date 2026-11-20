import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { fullUserSchemaV1 } from 'src/user/dtos/generic/v1/user.dto';
import { FullUserV1, UserResponseV1 } from 'src/user/interfaces/user';

const updateMyProfileResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_PROFILE_UPDATED),
  data: z.object({ user: fullUserSchemaV1.nullable() }),
});

export class UpdateMyProfileResponseDtoV1
  extends createZodDto(updateMyProfileResponseSchemaV1)
  implements JsonSerialized<UserResponseV1<{ user: FullUserV1 | null }>> {}
