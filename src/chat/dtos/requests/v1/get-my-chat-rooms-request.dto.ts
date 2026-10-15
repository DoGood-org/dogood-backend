import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChatRoomsParamsV1 } from 'src/chat/interfaces/chat';

const getMyChatRoomsRequestSchemaV1 = z.object({
  search: z.string().trim().max(100).optional(),
});

export class GetMyChatRoomsRequestDtoV1
  extends createZodDto(getMyChatRoomsRequestSchemaV1)
  implements ChatRoomsParamsV1 {}
