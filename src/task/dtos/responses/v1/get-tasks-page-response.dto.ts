import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { taskSchemaV1 } from 'src/task/dtos/generic/v1/task.dto';
import { PaginatedTasksResponseV1 } from 'src/task/interfaces/task';

const getTasksPageResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([SuccessCode.TASKS_RETRIEVED, SuccessCode.TASKS_SEARCHED]),
  data: z.object({ tasks: z.array(taskSchemaV1) }),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export class GetTasksPageResponseDtoV1
  extends createZodDto(getTasksPageResponseSchemaV1)
  implements JsonSerialized<PaginatedTasksResponseV1> {}
