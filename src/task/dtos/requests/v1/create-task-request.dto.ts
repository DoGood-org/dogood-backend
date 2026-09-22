import { CategoryType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateTaskRequestV1 } from 'src/task/interfaces/task';

// NOTE: `startTime` stays required by the legacy contract even though the current schema has no
// column for it — it is validated and then ignored on write.
const createTaskRequestSchemaV1 = z
  .object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().min(1, { message: 'Description is required' }),
    picture: z.url().optional(),
    isOrganization: z.boolean(),
    organizationId: z
      .uuid({ message: 'organizationId must be a valid UUID' })
      .optional(),
    startDate: z.iso.datetime({
      message: 'startDate must be a valid ISO date',
    }),
    startTime: z.iso.datetime({
      message: 'startTime must be a valid ISO date',
    }),
    endDate: z.iso
      .datetime({ message: 'endDate must be a valid ISO date' })
      .optional(),
    location: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
    locationName: z.string().optional(),
    amount: z.number().optional(),
    currentAmount: z.number().optional(),
    currency: z.string().optional(),
    requirements: z.string().optional(),
    categories: z
      .array(z.enum(CategoryType))
      .min(1, { message: 'At least one category is required' }),
  })
  .superRefine((data, ctx) => {
    const { isOrganization, organizationId } = data;

    if (isOrganization && !organizationId) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message: 'organizationId is required when isOrganization is true',
      });
    }

    if (!isOrganization && organizationId !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['organizationId'],
        message:
          'organizationId must not be provided when isOrganization is false',
      });
    }
  });

export class CreateTaskRequestDtoV1
  extends createZodDto(createTaskRequestSchemaV1)
  implements CreateTaskRequestV1 {}
