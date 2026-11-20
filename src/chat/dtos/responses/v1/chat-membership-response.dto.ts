import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { chatUserSchemaV1 } from 'src/chat/dtos/generic/v1/chat-room.dto';
import {
  ChatResponseV1,
  ChatRoomLeaveResultV1,
  ChatUserAddedResultV1,
  ChatUserRemovedDataV1,
} from 'src/chat/interfaces/chat';

const leaveChatRoomResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([SuccessCode.CHAT_ROOM_DELETED, SuccessCode.CHAT_USER_REMOVED]),
  message: z.string(),
  data: z.object({
    roomId: z.string(),
    userId: z.string(),
    status: z.enum(['userQuit', 'userIsOwner']),
    roomStatus: z.literal('deleted').optional(),
  }),
});

const addChatUserResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.CHAT_USER_ADDED),
  message: z.string(),
  data: z.object({
    roomId: z.string(),
    user: chatUserSchemaV1,
    status: z.enum(['added', 'reactivated']),
  }),
});

const removeChatUserResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.CHAT_USER_REMOVED),
  message: z.string(),
  data: z.object({
    room: z.object({
      roomId: z.string(),
      userId: z.string(),
      status: z.literal('removed'),
    }),
  }),
});

export class LeaveChatRoomResponseDtoV1
  extends createZodDto(leaveChatRoomResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatRoomLeaveResultV1>> {}

export class AddChatUserResponseDtoV1
  extends createZodDto(addChatUserResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatUserAddedResultV1>> {}

export class RemoveChatUserResponseDtoV1
  extends createZodDto(removeChatUserResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatUserRemovedDataV1>> {}
