import { JoinRequestStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateMembershipRequestStatusDataV2 } from 'src/organization/interfaces/organization';

const updateMembershipRequestStatusRequestSchemaV2 = z.object({
  status: z.enum([
    JoinRequestStatus.ACCEPTED,
    JoinRequestStatus.REJECTED,
    JoinRequestStatus.CANCELLED,
  ]),
});

export class UpdateMembershipRequestStatusRequestDtoV2
  extends createZodDto(updateMembershipRequestStatusRequestSchemaV2)
  implements UpdateMembershipRequestStatusDataV2 {}
