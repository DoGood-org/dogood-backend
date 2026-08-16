import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const resetPasswordResponseSchema = z.object({
  message: z.string(),
  code: z.nativeEnum(SuccessCode),
});

export class ResetPasswordResponseDto extends createZodDto(resetPasswordResponseSchema) {}
