import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  UpdateUserSettingsV1,
  UserSettingsThemeV1,
} from 'src/user/interfaces/v1/user';

/**
 * NOTE: one-to-one port of develop:src/schemas/user.schema.ts:54 `updateUserSettingsSchema`.
 * The legacy author wrote this schema and never mounted it on the route
 * (develop:src/routes/api/user.route.ts:21) — it is wired up here, see ADR-0008.
 * Every field is optional, so an empty body is valid and changes nothing.
 */
export const updateUserSettingsRequestSchemaV1 = z.object({
  theme: z.enum(UserSettingsThemeV1).optional(),
  language: z.string().min(2).max(5).optional(),
});

export class UpdateUserSettingsRequestDtoV1
  extends createZodDto(updateUserSettingsRequestSchemaV1)
  implements UpdateUserSettingsV1 {}
