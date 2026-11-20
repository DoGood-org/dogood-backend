import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { notificationSchemaV2 } from 'src/notification/dtos/generic/v2/notification.dto';
import { NotificationV2 } from 'src/notification/interfaces/notification';

const notificationResponseSchemaV2 = z.object({ data: notificationSchemaV2 });

export class NotificationResponseDtoV2
  extends createZodDto(notificationResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<NotificationV2>> {}
