import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateOrganizationDataV1 } from 'src/organization/interfaces/organization';

const organizationLocationSchemaV1 = z.object({
  country: z.string().min(2).max(100).optional(),
  region: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100).optional(),
});

// NOTE: legacy also accepted `stripeCustomerId`; it is dropped from the contract by the human's decision (defect #3).
export const createOrganizationRequestSchemaV1 = z.object({
  name: z.string().min(2).max(50),
  avatar: z.url().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  phoneNumber: z.string().min(5).max(30).optional(),
  email: z.email().optional(),
  moreInfo: z.string().max(2000).optional(),
  location: organizationLocationSchemaV1.optional(),
});

export class CreateOrganizationRequestDtoV1
  extends createZodDto(createOrganizationRequestSchemaV1)
  implements CreateOrganizationDataV1 {}
