import { TaskStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskStatusRequestV2 } from 'src/task/interfaces/task';

const updateTaskStatusRequestSchemaV2 = z.object({
  status: z.enum(TaskStatus),
});

export class UpdateTaskStatusRequestDtoV2
  extends createZodDto(updateTaskStatusRequestSchemaV2)
  implements UpdateTaskStatusRequestV2 {}
