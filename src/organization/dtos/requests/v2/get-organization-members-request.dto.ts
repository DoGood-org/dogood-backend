import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrganizationPageParamsV2 } from 'src/organization/interfaces/organization';

const getOrganizationMembersRequestSchemaV2 = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetOrganizationMembersRequestDtoV2
  extends createZodDto(getOrganizationMembersRequestSchemaV2)
  implements OrganizationPageParamsV2 {}
