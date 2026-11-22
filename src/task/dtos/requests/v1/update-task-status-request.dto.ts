import { TaskStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskStatusRequestV1 } from 'src/task/interfaces/task';
import { rejectionReasonSchema } from 'src/task/dtos/shared/rejection-reason.schema';

const updateTaskStatusRequestSchemaV1 = z
  .object({
    status: z.enum(TaskStatus),
    rejectionReason: rejectionReasonSchema.optional(),
  })
  .superRefine(({ status, rejectionReason }, ctx) => {
    if (status === TaskStatus.REJECTED && !rejectionReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejectionReason'],
        message: 'Rejection reason is required when status is REJECTED',
      });
    }
  });

export class UpdateTaskStatusRequestDtoV1
  extends createZodDto(updateTaskStatusRequestSchemaV1)
  implements UpdateTaskStatusRequestV1 {}
