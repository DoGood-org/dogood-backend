import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetMyNotificationsRequestV1 } from 'src/notification/interfaces/notification';

const getMyNotificationsRequestSchemaV1 = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export class GetMyNotificationsRequestDtoV1
  extends createZodDto(getMyNotificationsRequestSchemaV1)
  implements GetMyNotificationsRequestV1 {}
