import { createZodDto } from 'nestjs-zod';
import { createOrganizationRequestSchemaV2 } from 'src/organization/dtos/requests/v2/create-organization-request.dto';
import { UpdateOrganizationDataV2 } from 'src/organization/interfaces/organization';

const updateOrganizationRequestSchemaV2 =
  createOrganizationRequestSchemaV2.partial();

export class UpdateOrganizationRequestDtoV2
  extends createZodDto(updateOrganizationRequestSchemaV2)
  implements UpdateOrganizationDataV2 {}
