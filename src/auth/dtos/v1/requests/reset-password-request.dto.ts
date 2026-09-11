import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resetPasswordSchemaV1 = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
});

export class ResetPasswordRequestDtoV1 extends createZodDto(resetPasswordSchemaV1) {}
