import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateTaskRequestV2 } from 'src/task/interfaces/task';

// NOTE: `latitude: null` together with `longitude: null` clears the task location.
const updateTaskRequestSchemaV2 = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.url().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().optional(),
  amount: z.number().int().nonnegative().optional(),
  currentAmount: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  requirements: z.string().optional(),
  categories: z.array(z.enum(CategoryType)).min(1).optional(),
});

export class UpdateTaskRequestDtoV2
  extends createZodDto(updateTaskRequestSchemaV2)
  implements UpdateTaskRequestV2 {}
