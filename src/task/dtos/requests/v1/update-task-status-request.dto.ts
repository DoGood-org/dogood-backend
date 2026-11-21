import { TaskStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskStatusRequestV1 } from 'src/task/interfaces/task';

const updateTaskStatusRequestSchemaV1 = z.object({
  status: z.enum(TaskStatus),
  rejectionReason: z.string().trim().min(1).max(500).optional(),
});

export class UpdateTaskStatusRequestDtoV1
  extends createZodDto(updateTaskStatusRequestSchemaV1)
  implements UpdateTaskStatusRequestV1 {}
