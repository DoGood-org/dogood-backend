import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { notificationSchemaV1 } from 'src/notification/dtos/generic/v1/notification.dto';
import { NotificationResponseV1 } from 'src/notification/interfaces/notification';

const notificationResponseSchemaV1 = z.object({
  status: z.literal('success'),
  data: notificationSchemaV1,
});

export class NotificationResponseDtoV1
  extends createZodDto(notificationResponseSchemaV1)
  implements JsonSerialized<NotificationResponseV1> {}
