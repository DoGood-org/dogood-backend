import { TaskStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskStatusRequestV1 } from 'src/task/interfaces/task';

const updateTaskStatusRequestSchemaV1 = z.object({
  status: z.enum(TaskStatus),
});

export class UpdateTaskStatusRequestDtoV1
  extends createZodDto(updateTaskStatusRequestSchemaV1)
  implements UpdateTaskStatusRequestV1 {}
