import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { taskParticipantSchemaV2 } from 'src/task/dtos/generic/v2/task.dto';
import { TaskParticipantV2 } from 'src/task/interfaces/task';

const getTaskParticipantsResponseSchemaV2 = z.object({
  data: z.array(taskParticipantSchemaV2),
});

export class GetTaskParticipantsResponseDtoV2
  extends createZodDto(getTaskParticipantsResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<TaskParticipantV2[]>> {}
