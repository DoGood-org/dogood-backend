import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { taskSchemaV1 } from 'src/task/dtos/generic/v1/task.dto';
import { TaskResponseV1 } from 'src/task/interfaces/task';

const taskResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([
    SuccessCode.TASK_RETRIEVED,
    SuccessCode.TASK_CREATED,
    SuccessCode.TASK_UPDATED,
    SuccessCode.TASK_STATUS_UPDATED,
  ]),
  data: z.object({ task: taskSchemaV1 }),
});

export class TaskResponseDtoV1
  extends createZodDto(taskResponseSchemaV1)
  implements JsonSerialized<TaskResponseV1> {}
