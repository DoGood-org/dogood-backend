import { CategoryType, HostType, TaskStatus } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TaskParticipantV2, TaskV2 } from 'src/task/interfaces/task';

export const taskSchemaV2 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  status: z.enum(TaskStatus),
  categories: z.array(z.enum(CategoryType)),
  amount: z.number().nullable(),
  currentAmount: z.number().nullable(),
  currency: z.string().nullable(),
  requirements: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  locationName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  host: z.object({
    id: z.string(),
    type: z.enum(HostType),
    name: z.string().nullable(),
    avatar: z.string().nullable(),
  }),
  createdAt: z.iso.datetime(),
});

export const taskParticipantSchemaV2 = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  joinedAt: z.iso.datetime(),
});

export class TaskDtoV2
  extends createZodDto(taskSchemaV2)
  implements JsonSerialized<TaskV2> {}

export class TaskParticipantDtoV2
  extends createZodDto(taskParticipantSchemaV2)
  implements JsonSerialized<TaskParticipantV2> {}
