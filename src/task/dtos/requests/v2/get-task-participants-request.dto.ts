import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetTaskParticipantsRequestV2 } from 'src/task/interfaces/task';

const getTaskParticipantsRequestSchemaV2 = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetTaskParticipantsRequestDtoV2
  extends createZodDto(getTaskParticipantsRequestSchemaV2)
  implements GetTaskParticipantsRequestV2 {}
