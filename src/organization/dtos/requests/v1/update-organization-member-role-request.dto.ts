import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateOrganizationMemberRoleDataV1 } from 'src/organization/interfaces/organization';

// NOTE: `role` is checked in the service so a wrong value keeps the legacy 400 `MEMBER_ROLE_INVALID`.
const updateOrganizationMemberRoleRequestSchemaV1 = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
});

export class UpdateOrganizationMemberRoleRequestDtoV1
  extends createZodDto(updateOrganizationMemberRoleRequestSchemaV1)
  implements UpdateOrganizationMemberRoleDataV1 {}
