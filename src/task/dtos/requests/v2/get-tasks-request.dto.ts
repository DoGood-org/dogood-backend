import { CategoryType, Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetTasksRequestV2, TaskSortFieldV2 } from 'src/task/interfaces/task';

const getTasksRequestSchemaV2 = z.object({
  search: z.string().optional(),
  categories: z
    .preprocess(
      (value) => (typeof value === 'string' ? [value] : value),
      z.array(z.enum(CategoryType)),
    )
    .optional(),
  locationName: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().optional(),
  sort: z.enum(TaskSortFieldV2).optional(),
  sortDirection: z
    .enum([Prisma.SortOrder.asc, Prisma.SortOrder.desc])
    .optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetTasksRequestDtoV2
  extends createZodDto(getTasksRequestSchemaV2)
  implements GetTasksRequestV2 {}
