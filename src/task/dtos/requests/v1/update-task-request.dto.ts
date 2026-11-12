import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskRequestV1 } from 'src/task/interfaces/task';

// NOTE: the legacy schema accepts any string for the date fields, not an ISO date — kept verbatim.
// Legacy also allowed z.date(), which a JSON body can never produce; it is dropped because zod cannot
// represent Date in JSON Schema and Swagger generation crashed on it. Runtime behaviour is unchanged.
const updateTaskRequestSchemaV1 = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  picture: z.url().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
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
