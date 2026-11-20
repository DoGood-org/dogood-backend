import { SupportMessageStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  SupportMessageV1,
  SupportResponseV1,
} from 'src/support/interfaces/support';

const supportMessageSchemaV1 = z.object({
  id: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(SupportMessageStatus),
  createdAt: z.iso.datetime(),
});

const supportMessageResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([
    SuccessCode.SUPPORT_MESSAGE_CREATED,
    SuccessCode.SUPPORT_MESSAGE_FETCHED,
  ]),
  data: supportMessageSchemaV1,
});

const supportMessagesResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.SUPPORT_MESSAGES_FETCHED),
  data: z.array(supportMessageSchemaV1),
});

export class SupportMessageResponseDtoV1
  extends createZodDto(supportMessageResponseSchemaV1)
  implements JsonSerialized<SupportResponseV1<SupportMessageV1>> {}

export class SupportMessagesResponseDtoV1
  extends createZodDto(supportMessagesResponseSchemaV1)
  implements JsonSerialized<SupportResponseV1<SupportMessageV1[]>> {}
