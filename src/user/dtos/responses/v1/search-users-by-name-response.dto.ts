import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserMessageResponseV1, UserNameV1 } from 'src/user/interfaces/user';

const searchUsersByNameResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_DATA_RETRIEVED),
  message: z.string(),
  data: z.object({
    users: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        avatar: z.string().nullable(),
      }),
    ),
  }),
});

export class SearchUsersByNameResponseDtoV1
  extends createZodDto(searchUsersByNameResponseSchemaV1)
  implements JsonSerialized<UserMessageResponseV1<{ users: UserNameV1[] }>> {}
