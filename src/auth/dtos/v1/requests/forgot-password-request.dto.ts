import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const forgotPasswordSchemaV1 = z.object({
  email: z.email('Invalid email format'),
});

export class ForgotPasswordRequestDtoV1 extends createZodDto(
  forgotPasswordSchemaV1,
) {}
