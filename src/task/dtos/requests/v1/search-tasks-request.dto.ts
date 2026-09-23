import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SearchTasksRequestV1 } from 'src/task/interfaces/task';

const searchTasksRequestSchemaV1 = z.object({
  title: z.string().optional(),
  categories: z.array(z.enum(CategoryType)).optional(),
  locationName: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  radiusKm: z.number().min(0).optional(),
});

export class SearchTasksRequestDtoV1
  extends createZodDto(searchTasksRequestSchemaV1)
  implements SearchTasksRequestV1 {}
