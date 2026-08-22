import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserSettingsV2 } from 'src/user/interfaces/v2/user-settings';

export const userSettingsSchema = z.object({
  id: z.string(),
  theme: z.string(),
  language: z.string(),
});

export class UserSettingsV2Dto
  extends createZodDto(userSettingsSchema)
  implements UserSettingsV2 {}
