import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetNotificationsResponseV1 } from 'src/notification/interfaces/v1/notification-v1';
import { notificationV1Schema } from 'src/notification/dto/v1/generic/notification-v1.dto';

export const paginationV1Schema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  pages: z.number().int(),
});

export const getNotificationsResponseV1Schema = z.object({
  status: z.literal('success'),
  data: z.array(notificationV1Schema),
  pagination: paginationV1Schema,
});

export class GetNotificationsResponseV1Dto
  extends createZodDto(getNotificationsResponseV1Schema)
  implements GetNotificationsResponseV1 {}
