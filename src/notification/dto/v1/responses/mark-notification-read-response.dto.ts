import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MarkNotificationReadResponseV1 } from 'src/notification/interfaces/v1/notification-v1';
import { notificationV1Schema } from 'src/notification/dto/v1/generic/notification-v1.dto';

export const markNotificationReadResponseV1Schema = z.object({
  status: z.literal('success'),
  data: notificationV1Schema,
});

export class MarkNotificationReadResponseV1Dto
  extends createZodDto(markNotificationReadResponseV1Schema)
  implements MarkNotificationReadResponseV1 {}
