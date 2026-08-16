import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SuccessCode } from '@shared/constants/api-codes';

export const loginResponseSchema = z.object({
  message: z.string(),
  code: z.nativeEnum(SuccessCode),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string().nullable(),
    siteRole: z.string(),
    settings: z.object({
      theme: z.string(),
      language: z.string(),
    }),
    profile: z.record(z.string(), z.any()).nullable(),
  }),
});

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
