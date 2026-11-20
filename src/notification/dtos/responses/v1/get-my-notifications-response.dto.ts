import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { notificationSchemaV1 } from 'src/notification/dtos/generic/v1/notification.dto';
import { MyNotificationsResponseV1 } from 'src/notification/interfaces/notification';

const getMyNotificationsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  data: z.array(notificationSchemaV1),
  pagination: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    pages: z.number().int(),
  }),
});

export class GetMyNotificationsResponseDtoV1
  extends createZodDto(getMyNotificationsResponseSchemaV1)
  implements JsonSerialized<MyNotificationsResponseV1> {}
