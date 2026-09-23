import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  OrganizationSortFieldV2,
  OrganizationsParamsV2,
} from 'src/organization/interfaces/organization';

const getOrganizationsRequestSchemaV2 = z.object({
  search: z.string().optional(),
  sort: z.enum(OrganizationSortFieldV2).optional(),
  sortDirection: z
    .enum([Prisma.SortOrder.asc, Prisma.SortOrder.desc])
    .optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetOrganizationsRequestDtoV2
  extends createZodDto(getOrganizationsRequestSchemaV2)
  implements OrganizationsParamsV2 {}
