import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GetMyNotificationsRequestV2 } from 'src/notification/interfaces/notification';

const getMyNotificationsRequestSchemaV2 = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class GetMyNotificationsRequestDtoV2
  extends createZodDto(getMyNotificationsRequestSchemaV2)
  implements GetMyNotificationsRequestV2 {}
