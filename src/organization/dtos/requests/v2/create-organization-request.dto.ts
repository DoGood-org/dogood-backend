import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateOrganizationDataV2 } from 'src/organization/interfaces/organization';

export const createOrganizationRequestSchemaV2 = z.object({
  name: z.string().trim().min(2).max(100),
  avatarUrl: z.url().optional(),
  description: z.string().max(1000).optional(),
  phoneNumber: z.string().min(5).max(30).optional(),
  email: z.email().optional(),
  additionalInfo: z.string().max(2000).optional(),
  location: z
    .object({
      country: z.string().min(2).max(100).optional(),
      region: z.string().min(2).max(100).optional(),
      city: z.string().min(2).max(100).optional(),
    })
    .optional(),
});

export class CreateOrganizationRequestDtoV2
  extends createZodDto(createOrganizationRequestSchemaV2)
  implements CreateOrganizationDataV2 {}
