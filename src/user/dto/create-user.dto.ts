import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SiteRole } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
  siteRole: z.enum(SiteRole).optional().default(SiteRole.USER),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
