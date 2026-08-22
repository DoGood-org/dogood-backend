import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetNotificationsV1 } from 'src/notification/interfaces/v1/notification-v1';

/** Обидва поля опційні — дефолти лежать у NotificationV1Service.getNotifications. */
export const getNotificationsV1Schema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export class GetNotificationsRequestV1Dto
  extends createZodDto(getNotificationsV1Schema)
  implements GetNotificationsV1 {}
