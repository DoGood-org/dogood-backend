import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationV1 } from 'src/notification/interfaces/v1/notification-v1';

export const notificationV1Schema = z.object({
  id: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  relatedId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.custom<Prisma.JsonValue>(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class NotificationV1Dto
  extends createZodDto(notificationV1Schema)
  implements NotificationV1 {}
