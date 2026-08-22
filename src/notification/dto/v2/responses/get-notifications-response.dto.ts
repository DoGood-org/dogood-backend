import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationV2 } from 'src/notification/interfaces/v2/notification-v2';

export const notificationV2Schema = z.object({
  id: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  readAt: z.date().nullable(),
  relatedId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.custom<Prisma.JsonValue>(),
  createdAt: z.date(),
});

export class GetNotificationsResponseV2Dto
  extends createZodDto(notificationV2Schema)
  implements NotificationV2 {}
