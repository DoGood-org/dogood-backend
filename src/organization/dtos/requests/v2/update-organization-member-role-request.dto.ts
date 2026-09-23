import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ASSIGNABLE_ORGANIZATION_ROLES,
  UpdateOrganizationMemberRoleDataV2,
} from 'src/organization/interfaces/organization';

const updateOrganizationMemberRoleRequestSchemaV2 = z.object({
  role: z.enum(ASSIGNABLE_ORGANIZATION_ROLES),
});

export class UpdateOrganizationMemberRoleRequestDtoV2
  extends createZodDto(updateOrganizationMemberRoleRequestSchemaV2)
  implements UpdateOrganizationMemberRoleDataV2 {}
