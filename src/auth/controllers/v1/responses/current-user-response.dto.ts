import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const currentUserResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  code: z.nativeEnum(SuccessCode),
  user: z.record(z.string(), z.any()),
});

export class CurrentUserResponseDto extends createZodDto(currentUserResponseSchema) {}
