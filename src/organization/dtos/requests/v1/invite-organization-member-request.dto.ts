import { MembershipStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ASSIGNABLE_ORGANIZATION_ROLES,
  InviteOrganizationMemberDataV1,
} from 'src/organization/interfaces/organization';

// NOTE: legacy schema plus `organizationId` (defect #1); `status` stays required and unused, as in legacy.
const inviteOrganizationMemberRequestSchemaV1 = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.enum(ASSIGNABLE_ORGANIZATION_ROLES),
  status: z.enum(MembershipStatus),
});

export class InviteOrganizationMemberRequestDtoV1
  extends createZodDto(inviteOrganizationMemberRequestSchemaV1)
  implements InviteOrganizationMemberDataV1 {}
