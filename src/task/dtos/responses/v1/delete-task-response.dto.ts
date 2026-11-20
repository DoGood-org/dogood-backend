import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TaskDeletedResponseV1 } from 'src/task/interfaces/task';

const deleteTaskResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.TASK_DELETED),
});

export class DeleteTaskResponseDtoV1
  extends createZodDto(deleteTaskResponseSchemaV1)
  implements JsonSerialized<TaskDeletedResponseV1> {}
