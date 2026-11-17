import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TasksPageParamsV1 } from 'src/task/interfaces/task';

const getTasksPageRequestSchemaV1 = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export class GetTasksPageRequestDtoV1
  extends createZodDto(getTasksPageRequestSchemaV1)
  implements TasksPageParamsV1 {}
