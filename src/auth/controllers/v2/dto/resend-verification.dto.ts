import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resendVerificationSchema = z.object({
  email: z.email('Invalid email format'),
});

export class ResendVerificationDto extends createZodDto(
  resendVerificationSchema,
) {}
