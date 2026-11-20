import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { taskSchemaV2 } from 'src/task/dtos/generic/v2/task.dto';
import { TaskV2 } from 'src/task/interfaces/task';

const getTasksResponseSchemaV2 = z.object({ data: z.array(taskSchemaV2) });

export class GetTasksResponseDtoV2
  extends createZodDto(getTasksResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<TaskV2[]>> {}
