import { Gender } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateMyProfileV2 } from 'src/user/interfaces/v2/user';

/** NOTE: no `role` and no `stripeCustomerId` — unknown keys are stripped by zod. */
export const updateMyProfileRequestSchemaV2 = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional().nullable(),
  /**
   * NOTE: http and https only. The value is served to anonymous callers by the
   * public `GET /api/v2/users/:id`, so the protocol whitelist has to cut
   * `javascript:`, `data:` and `file:` here, at the trust boundary, rather than
   * rely on the client.
   */
  avatar: z
    .union([
      z.url({
        protocol: /^https?$/,
        error: 'Avatar must be an http or https URL',
      }),
      z.literal(''),
    ])
    .optional()
    .nullable(),
  gender: z.enum(Gender).optional().nullable(),
  birthDate: z.coerce
    .date()
    .refine((date) => date < new Date(), "Birth date can't be in the future")
    .optional()
    .nullable(),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  /**
   * NOTE: `.trim()` runs before `.min(2)`, so a whitespace-only value is rejected instead of
   * becoming a blank row in the shared `Location` dictionary, and `" Kyiv "` is stored as
   * `"Kyiv"` — otherwise the same city yields a new row per spelling.
   */
  location: z
    .object({
      country: z.string().trim().min(2).optional().nullable(),
      region: z.string().trim().min(2).optional().nullable(),
      city: z.string().trim().min(2).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export class UpdateMyProfileRequestDtoV2
  extends createZodDto(updateMyProfileRequestSchemaV2)
  implements UpdateMyProfileV2 {}
