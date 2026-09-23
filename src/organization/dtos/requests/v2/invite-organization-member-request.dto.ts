import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { InviteOrganizationMemberDataV2 } from 'src/organization/interfaces/organization';

const inviteOrganizationMemberRequestSchemaV2 = z.object({
  userId: z.uuid(),
});

export class InviteOrganizationMemberRequestDtoV2
  extends createZodDto(inviteOrganizationMemberRequestSchemaV2)
  implements InviteOrganizationMemberDataV2 {}
