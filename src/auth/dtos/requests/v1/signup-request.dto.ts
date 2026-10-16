import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SignupDataV1 } from 'src/auth/interfaces/auth';

// NOTE: legacy `signUpSchema` verbatim.
const signupRequestSchemaV1 = z.object({
  name: z
    .string('Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be at most 30 characters'),
  email: z.email('Invalid email address'),
  password: z
    .string('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export class SignupRequestDtoV1
  extends createZodDto(signupRequestSchemaV1)
  implements SignupDataV1 {}
