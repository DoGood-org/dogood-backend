import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  UpdateMySettingsV2,
  UserSettingsThemeV2,
} from 'src/user/interfaces/v2/user';

/**
 * NOTE: same accepted value set as v1 — a two-value theme and a 2..5 character language tag.
 * The tag is deliberately not narrowed to `SUPPORTED_LANGUAGES`: it is a stored preference,
 * not a translation lookup, and narrowing it would reject values v1 accepts.
 */
export const updateMySettingsRequestSchemaV2 = z.object({
  theme: z.enum(UserSettingsThemeV2).optional(),
  language: z.string().min(2).max(5).optional(),
});

export class UpdateMySettingsRequestDtoV2
  extends createZodDto(updateMySettingsRequestSchemaV2)
  implements UpdateMySettingsV2 {}
