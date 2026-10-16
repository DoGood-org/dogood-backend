import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResetPasswordDataV1 } from 'src/auth/interfaces/auth';

// NOTE: legacy `resetPasswordSchema` verbatim.
const resetPasswordRequestSchemaV1 = z.object({
  password: z
    .string('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export class ResetPasswordRequestDtoV1
  extends createZodDto(resetPasswordRequestSchemaV1)
  implements ResetPasswordDataV1 {}
