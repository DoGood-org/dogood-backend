import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationMessageResponseV1 } from 'src/notification/interfaces/notification';

const notificationMessageResponseSchemaV1 = z.object({
  status: z.literal('success'),
  message: z.string(),
});

export class NotificationMessageResponseDtoV1
  extends createZodDto(notificationMessageResponseSchemaV1)
  implements JsonSerialized<NotificationMessageResponseV1> {}
