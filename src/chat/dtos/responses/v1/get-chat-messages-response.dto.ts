import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { chatMessageSchemaV1 } from 'src/chat/dtos/generic/v1/chat-room.dto';
import { ChatMessagesDataV1, ChatResponseV1 } from 'src/chat/interfaces/chat';

const getChatMessagesResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.CHAT_MESSAGES_RETRIEVED),
  message: z.string(),
  data: z.object({
    messages: z.object({
      messages: z.array(chatMessageSchemaV1),
      nextCursor: z.string().nullable(),
    }),
  }),
});

export class GetChatMessagesResponseDtoV1
  extends createZodDto(getChatMessagesResponseSchemaV1)
  implements JsonSerialized<ChatResponseV1<ChatMessagesDataV1>> {}
