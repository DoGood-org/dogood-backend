import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MarkAllNotificationsReadV2 } from 'src/notification/interfaces/v2/notification-v2';

export const markAllNotificationsReadV2Schema = z.object({
  updated: z.number().int(),
});

export class MarkAllNotificationsReadResponseV2Dto
  extends createZodDto(markAllNotificationsReadV2Schema)
  implements MarkAllNotificationsReadV2 {}
