import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from 'src/i18n/i18n.constants';
import { UpdateUserSettingsV2 } from 'src/user/interfaces/v2/user-settings';

export const updateUserSettingsSchema = z
  .object({
    theme: z.enum(['light', 'dark']).optional(),
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
  })
  .strict();

export class UpdateUserSettingsRequestV2Dto
  extends createZodDto(updateUserSettingsSchema)
  implements UpdateUserSettingsV2 {}
