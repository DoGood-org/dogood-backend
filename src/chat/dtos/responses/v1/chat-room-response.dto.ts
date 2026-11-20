import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { chatRoomSchemaV1 } from 'src/chat/dtos/generic/v1/chat-room.dto';
import {
  ChatResponseV1,
  ChatRoomDataV1,
  ChatRoomsDataV1,
} from 'src/chat/interfaces/chat';

const chatRoomResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([
    SuccessCode.CHAT_ROOM_CREATED,
    SuccessCode.CHAT_ROOM_RETRIEVED,
  ]),
  message: z.string(),
  data: z.object({ room: chatRoomSchemaV1 }),
});

const chatRoomsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.CHAT_ROOMS_RETRIEVED),
  message: z.string(),
  data: z.object({ rooms: z.array(chatRoomSchemaV1) }),
});

export class ChatRoomResponseDtoV1
  extends createZodDto(chatRoomResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatRoomDataV1>> {}

export class ChatRoomsResponseDtoV1
  extends createZodDto(chatRoomsResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatRoomsDataV1>> {}
