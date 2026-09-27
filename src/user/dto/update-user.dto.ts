import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { registerSchema } from 'src/auth/dto/register.dto';

// NOTE: no `role` — a user must never set their own site role.
// Changing the password needs the current one, so a hijacked session can't lock the owner out.
export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: registerSchema.shape.password.optional(),
    currentPassword: z.string().min(1).max(100).optional(),
  })
  .refine(
    ({ password, currentPassword }) =>
      password === undefined || currentPassword !== undefined,
    {
      path: ['currentPassword'],
      message: 'Current password is required to change the password',
    },
  );

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
