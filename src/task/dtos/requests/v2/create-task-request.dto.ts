import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateTaskRequestV2 } from 'src/task/interfaces/task';

const createTaskRequestSchemaV2 = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    imageUrl: z.url().optional(),
    isOrganization: z.boolean(),
    organizationId: z.uuid().optional(),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationName: z.string().optional(),
    amount: z.number().int().nonnegative().optional(),
    currentAmount: z.number().int().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    requirements: z.string().optional(),
    categories: z.array(z.enum(CategoryType)).min(1),
  })
  .superRefine((data, ctx) => {
    const { isOrganization, organizationId } = data;

    if (isOrganization !== (organizationId !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message:
          'organizationId is required exactly when isOrganization is true',
      });
    }
  });

export class CreateTaskRequestDtoV2
  extends createZodDto(createTaskRequestSchemaV2)
  implements CreateTaskRequestV2 {}
