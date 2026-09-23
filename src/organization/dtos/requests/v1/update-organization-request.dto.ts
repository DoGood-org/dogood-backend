import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createOrganizationRequestSchemaV1 } from 'src/organization/dtos/requests/v1/create-organization-request.dto';
import { UpdateOrganizationDataV1 } from 'src/organization/interfaces/organization';

// NOTE: legacy allows a 100-character name here and only 50 on create — kept verbatim.
const updateOrganizationRequestSchemaV1 = createOrganizationRequestSchemaV1
  .partial()
  .extend({ name: z.string().min(2).max(100).optional() });

export class UpdateOrganizationRequestDtoV1
  extends createZodDto(updateOrganizationRequestSchemaV1)
  implements UpdateOrganizationDataV1 {}
