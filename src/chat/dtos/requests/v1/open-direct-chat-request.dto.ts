import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OpenDirectChatDataV1 } from 'src/chat/interfaces/chat';

const openDirectChatRequestSchemaV1 = z.object({
  userId: z.uuid({ message: 'Invalid user ID' }),
});

export class OpenDirectChatRequestDtoV1
  extends createZodDto(openDirectChatRequestSchemaV1)
  implements OpenDirectChatDataV1 {}
