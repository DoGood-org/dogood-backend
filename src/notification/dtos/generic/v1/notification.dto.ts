import { NotificationType } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationV1 } from 'src/notification/interfaces/notification';

export const notificationSchemaV1 = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  relatedId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.json().nullable(),
  isRead: z.boolean(),
  createdAt: z.iso.datetime(),
});

export class NotificationDtoV1
  extends createZodDto(notificationSchemaV1)
  implements JsonSerialized<NotificationV1> {}
