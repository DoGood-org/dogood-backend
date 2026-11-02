import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateUserSettingsDataV1 } from 'src/user/interfaces/user';

// NOTE: legacy declared `updateUserSettingsSchema` but never mounted it, so any body reached
// `userSettings.upsert` (mass assignment, `userId` included). The schema is applied here and
// unknown keys are stripped — a deliberate break from legacy parity.
const updateUserSettingsRequestSchemaV1 = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().min(2).max(5).optional(),
});

export class UpdateUserSettingsRequestDtoV1
  extends createZodDto(updateUserSettingsRequestSchemaV1)
  implements UpdateUserSettingsDataV1 {}
