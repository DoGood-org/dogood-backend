import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  GetNotificationsV2,
  NotificationSortField,
} from 'src/notification/interfaces/v2/get-notifications';

/**
 * Усі поля опційні — дефолти лежать у NotificationV2Service.getNotifications.
 * `isRead` через `z.stringbool()`, бо `z.coerce.boolean()` зробив би `?isRead=false` істинним.
 */
export const getNotificationsV2Schema = z.object({
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(NotificationSortField).optional(),
  sortDirection: z.enum(Prisma.SortOrder).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  isRead: z.stringbool().optional(),
});

export class GetNotificationsRequestV2Dto
  extends createZodDto(getNotificationsV2Schema)
  implements GetNotificationsV2 {}
