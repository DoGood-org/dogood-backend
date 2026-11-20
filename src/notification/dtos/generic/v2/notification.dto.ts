import { NotificationType } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationV2 } from 'src/notification/interfaces/notification';

export const notificationSchemaV2 = z.object({
  id: z.string(),
  type: z.enum(NotificationType),
  title: z.string(),
  body: z.string(),
  relatedId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.json().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export class NotificationDtoV2
  extends createZodDto(notificationSchemaV2)
  implements JsonSerialized<NotificationV2> {}
