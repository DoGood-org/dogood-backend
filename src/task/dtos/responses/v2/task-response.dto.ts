import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { taskSchemaV2 } from 'src/task/dtos/generic/v2/task.dto';
import { TaskV2 } from 'src/task/interfaces/task';

const taskResponseSchemaV2 = z.object({ data: taskSchemaV2 });

export class TaskResponseDtoV2
  extends createZodDto(taskResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<TaskV2>> {}
