import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ErrorCode } from '@shared/constants/api-codes';

export const bannedUserResponseSchema = z.object({
  message: z.string(),
  code: z.nativeEnum(ErrorCode),
  bannedUser: z.object({
    accountId: z.string(),
    suspendedOn: z.date().or(z.string()),
    suspensionType: z.string().nullable(),
    reason: z.string(),
    banExpiresAt: z.date().or(z.string()).nullable(),
  }),
});

export class BannedUserResponseDto extends createZodDto(bannedUserResponseSchema) {}
