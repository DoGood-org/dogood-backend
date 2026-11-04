import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CHAT_PINNED_ROOMS_LIMIT,
  ReorderPinnedChatRoomsDataV1,
} from 'src/chat/interfaces/chat';

const reorderPinnedChatRoomsRequestSchemaV1 = z.object({
  roomIds: z
    .array(z.uuid({ message: 'Invalid room ID' }))
    .max(CHAT_PINNED_ROOMS_LIMIT)
    .refine((roomIds) => new Set(roomIds).size === roomIds.length, {
      message: 'Room IDs must be unique',
    }),
});

export class ReorderPinnedChatRoomsRequestDtoV1
  extends createZodDto(reorderPinnedChatRoomsRequestSchemaV1)
  implements ReorderPinnedChatRoomsDataV1 {}
