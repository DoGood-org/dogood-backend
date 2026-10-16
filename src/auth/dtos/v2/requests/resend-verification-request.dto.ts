import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resendVerificationSchemaV2 = z.object({
  email: z.email('Invalid email format'),
});

export class ResendVerificationRequestDtoV2 extends createZodDto(
  resendVerificationSchemaV2,
) {}
