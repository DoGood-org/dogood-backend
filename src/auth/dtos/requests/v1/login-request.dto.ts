import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { LoginDataV1 } from 'src/auth/interfaces/auth';

// NOTE: legacy `loginSchema` verbatim.
const loginRequestSchemaV1 = z.object({
  email: z.email('Invalid email address'),
  password: z
    .string('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export class LoginRequestDtoV1
  extends createZodDto(loginRequestSchemaV1)
  implements LoginDataV1 {}
