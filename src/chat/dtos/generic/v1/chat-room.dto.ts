import { SiteRole } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChatMessageV1, ChatRoomV1 } from 'src/chat/interfaces/chat';

export const chatUserSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  siteRole: z.enum(SiteRole),
  avatar: z.string().optional(),
});

export const chatMessageSchemaV1 = z.object({
  id: z.string(),
  senderId: z.string(),
  sender: chatUserSchemaV1,
  roomId: z.string(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reactions: z.array(
    z.object({
      reactionId: z.string(),
      reaction: z.string(),
      userId: z.string(),
    }),
  ),
});

export const chatRoomSchemaV1 = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  owner: chatUserSchemaV1,
  participants: z.array(
    z.object({
      userId: z.string(),
      roomId: z.string(),
      wasLeft: z.boolean(),
      leftAt: z.iso.datetime().nullable(),
      joinedAt: z.iso.datetime(),
    }),
  ),
  messages: z.array(chatMessageSchemaV1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ChatMessageDtoV1
  extends createZodDto(chatMessageSchemaV1)
  implements JsonSerialized<ChatMessageV1> {}

export class ChatRoomDtoV1
  extends createZodDto(chatRoomSchemaV1)
  implements JsonSerialized<ChatRoomV1> {}
