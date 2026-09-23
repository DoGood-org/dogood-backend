import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateSupportMessageDataV1 } from 'src/support/interfaces/support';

const createSupportMessageRequestSchemaV1 = z.object({
  email: z.email(),
  subject: z.string().min(3).max(100),
  message: z.string().min(10),
});

export class CreateSupportMessageRequestDtoV1
  extends createZodDto(createSupportMessageRequestSchemaV1)
  implements CreateSupportMessageDataV1 {}
