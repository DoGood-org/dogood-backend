import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CreateJoinRequestDataV1,
  JoinRequestDirectionV1,
} from 'src/organization/interfaces/organization';

const createJoinRequestRequestSchemaV1 = z.object({
  receiverOrganizationId: z.string().optional(),
  receiverUserId: z.string().optional(),
  direction: z.enum(JoinRequestDirectionV1),
});

export class CreateJoinRequestRequestDtoV1
  extends createZodDto(createJoinRequestRequestSchemaV1)
  implements CreateJoinRequestDataV1 {}
