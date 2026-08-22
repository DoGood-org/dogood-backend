import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DeleteNotificationResponseV1 } from 'src/notification/interfaces/v1/notification-v1';

export const deleteNotificationResponseV1Schema = z.object({
  status: z.literal('success'),
});

export class DeleteNotificationResponseV1Dto
  extends createZodDto(deleteNotificationResponseV1Schema)
  implements DeleteNotificationResponseV1 {}
