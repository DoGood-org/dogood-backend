import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateChatRoomDataV1 } from 'src/chat/interfaces/chat';

const createChatRoomRequestSchemaV1 = z.object({
  participantsIds: z
    .array(z.uuid({ message: 'Invalid participant ID' }))
    .min(1, { message: 'At least one participant ID is required' }),
});

export class CreateChatRoomRequestDtoV1
  extends createZodDto(createChatRoomRequestSchemaV1)
  implements CreateChatRoomDataV1 {}
