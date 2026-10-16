import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchemaV2 = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginRequestDtoV2 extends createZodDto(loginSchemaV2) {}
