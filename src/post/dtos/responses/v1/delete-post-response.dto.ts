import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PostDeletedResponseV1 } from 'src/post/interfaces/post';

const deletePostResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.POST_DELETED),
});

export class DeletePostResponseDtoV1
  extends createZodDto(deletePostResponseSchemaV1)
  implements JsonSerialized<PostDeletedResponseV1> {}
