import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const registerResponseSchema = z.object({
  status: z.literal('success').optional(),
  code: z.nativeEnum(SuccessCode),
  message: z.string(),
});

export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}
