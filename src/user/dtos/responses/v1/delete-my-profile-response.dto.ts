import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserDeletedResponseV1 } from 'src/user/interfaces/user';

const deleteMyProfileResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_DELETED),
});

export class DeleteMyProfileResponseDtoV1
  extends createZodDto(deleteMyProfileResponseSchemaV1)
  implements JsonSerialized<UserDeletedResponseV1> {}
