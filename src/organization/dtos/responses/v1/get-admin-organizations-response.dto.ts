import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { adminOrganizationSchemaV1 } from 'src/organization/dtos/generic/v1/organization.dto';
import { AdminOrganizationsResponseV1 } from 'src/organization/interfaces/organization';

const getAdminOrganizationsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_DATA_RETRIEVED),
  message: z.string(),
  data: z.array(adminOrganizationSchemaV1),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export class GetAdminOrganizationsResponseDtoV1
  extends createZodDto(getAdminOrganizationsResponseSchemaV1)
  implements JsonSerialized<AdminOrganizationsResponseV1> {}
