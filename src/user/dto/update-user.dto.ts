import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SiteRole } from '@prisma/client';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(SiteRole).optional(),
});

export class UpdateUserDto extends createZodDto(updateUserSchema) { }
