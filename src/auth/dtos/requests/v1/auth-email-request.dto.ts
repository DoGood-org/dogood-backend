import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AuthEmailDataV1 } from 'src/auth/interfaces/auth';

// NOTE: legacy `forgotPasswordSchema` — shared by resend-verification, forgot-password and its resend.
const authEmailRequestSchemaV1 = z.object({
  email: z.email('Invalid email address'),
});

export class AuthEmailRequestDtoV1
  extends createZodDto(authEmailRequestSchemaV1)
  implements AuthEmailDataV1 {}
