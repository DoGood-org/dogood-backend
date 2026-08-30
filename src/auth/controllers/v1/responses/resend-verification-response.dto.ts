import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const resendVerificationResponseSchema = z.object({
  message: z.string(),
  code: z.nativeEnum(SuccessCode),
});

export class ResendVerificationResponseDto extends createZodDto(resendVerificationResponseSchema) {}
