import { CategoryType, HostType, TaskStatus } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { TaskV1 } from 'src/task/interfaces/task';

export const taskSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  picture: z.string().nullable(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  locationName: z.string().nullable(),
  amount: z.number().nullable(),
  currentAmount: z.number().nullable(),
  currency: z.string().nullable(),
  requirements: z.string().nullable(),
  status: z.enum(TaskStatus),
  categories: z.array(z.enum(CategoryType)),
  host: z.object({
    type: z.enum(HostType),
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        avatar: z.string().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
      })
      .nullable(),
    organization: z
      .object({
        id: z.string(),
        name: z.string(),
        avatar: z.string().nullable(),
        createdAt: z.iso.datetime(),
      })
      .nullable(),
  }),
  joinedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
});

export class TaskDtoV1
  extends createZodDto(taskSchemaV1)
  implements JsonSerialized<TaskV1> {}
