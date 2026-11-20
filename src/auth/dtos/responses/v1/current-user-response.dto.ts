import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CurrentUserResponseV1 } from 'src/auth/interfaces/auth';
import { fullUserSchemaV1 } from 'src/user/dtos/generic/v1/user.dto';

const currentUserResponseSchemaV1 = z.object({
  status: z.literal('success'),
  message: z.string(),
  code: z.literal(SuccessCode.USER_DATA_RETRIEVED),
  user: fullUserSchemaV1.nullable(),
});

export class CurrentUserResponseDtoV1
  extends createZodDto(currentUserResponseSchemaV1)
  implements JsonSerialized<CurrentUserResponseV1> {}
