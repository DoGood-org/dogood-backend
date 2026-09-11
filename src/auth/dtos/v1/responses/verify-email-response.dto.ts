import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const verifyEmailResponseSchema = z.object({
  status: z.literal('success'),
  code: z.nativeEnum(SuccessCode),
  message: z.string(),
});

export class VerifyEmailResponseDtoV1 extends createZodDto(verifyEmailResponseSchema) {}
