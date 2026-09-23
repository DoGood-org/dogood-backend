import { JoinRequestStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateJoinRequestStatusDataV1 } from 'src/organization/interfaces/organization';

const updateJoinRequestStatusRequestSchemaV1 = z.object({
  id: z.string(),
  status: z.enum(JoinRequestStatus),
});

export class UpdateJoinRequestStatusRequestDtoV1
  extends createZodDto(updateJoinRequestStatusRequestSchemaV1)
  implements UpdateJoinRequestStatusDataV1 {}
