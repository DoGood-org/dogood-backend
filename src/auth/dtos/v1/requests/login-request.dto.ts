import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchemaV1 = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginRequestDtoV1 extends createZodDto(loginSchemaV1) {}
