import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resendVerificationSchemaV1 = z.object({
  email: z.email('Invalid email format'),
});

export class ResendVerificationRequestDtoV1 extends createZodDto(
  resendVerificationSchemaV1,
) {}
