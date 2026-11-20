import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  MarkAllMyNotificationsReadResultV2,
  MyUnreadNotificationsCountV2,
} from 'src/notification/interfaces/notification';

const notificationsCountResponseSchemaV2 = z.object({
  data: z.object({ count: z.number().int() }),
});

// NOTE: unread-count and read-all answer the same `{ data: { count } }` shape.
export class NotificationsCountResponseDtoV2
  extends createZodDto(notificationsCountResponseSchemaV2)
  implements
    JsonSerialized<ResponseWrapper<MyUnreadNotificationsCountV2>>,
    JsonSerialized<ResponseWrapper<MarkAllMyNotificationsReadResultV2>> {}
