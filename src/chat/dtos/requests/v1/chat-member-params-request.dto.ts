import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChatMemberParamsV1 } from 'src/chat/interfaces/chat';

const chatMemberParamsRequestSchemaV1 = z.object({
  roomId: z.uuid({ message: 'Invalid room ID' }),
  userId: z.uuid({ message: 'Invalid user ID' }),
});

export class ChatMemberParamsRequestDtoV1
  extends createZodDto(chatMemberParamsRequestSchemaV1)
  implements ChatMemberParamsV1 {}
