import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const forgotPasswordSchemaV2 = z.object({
  email: z.email('Invalid email format'),
});

export class ForgotPasswordRequestDtoV2 extends createZodDto(forgotPasswordSchemaV2) {}
