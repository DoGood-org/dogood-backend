import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskRequestV1 } from 'src/task/interfaces/task';

// NOTE: the legacy schema accepts any string for the date fields, not an ISO date — kept verbatim.
const updateTaskRequestSchemaV1 = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  picture: z.url().optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  amount: z.number().optional(),
  currentAmount: z.number().optional(),
  currency: z.string().optional(),
  requirements: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  locationName: z.string().optional(),
  categories: z.array(z.enum(CategoryType)).optional(),
});

export class UpdateTaskRequestDtoV1
  extends createZodDto(updateTaskRequestSchemaV1)
  implements UpdateTaskRequestV1 {}
