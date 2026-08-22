import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MarkAllNotificationsReadResponseV1 } from 'src/notification/interfaces/v1/notification-v1';

export const markAllNotificationsReadResponseV1Schema = z.object({
  status: z.literal('success'),
  message: z.string(),
});

export class MarkAllNotificationsReadResponseV1Dto
  extends createZodDto(markAllNotificationsReadResponseV1Schema)
  implements MarkAllNotificationsReadResponseV1 {}
