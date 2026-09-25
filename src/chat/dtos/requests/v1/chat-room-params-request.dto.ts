import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChatRoomParamsV1 } from 'src/chat/interfaces/chat';

const chatRoomParamsRequestSchemaV1 = z.object({
  roomId: z.uuid({ message: 'Invalid room ID' }),
});

export class ChatRoomParamsRequestDtoV1
  extends createZodDto(chatRoomParamsRequestSchemaV1)
  implements ChatRoomParamsV1 {}
