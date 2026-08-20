import { createZodDto } from 'nestjs-zod';
import { UserSettingsV2 } from 'src/user/interfaces/v2/user-settings';
import { userSettingsSchema } from 'src/user/dto/v2/generic/user-settings.dto';

export class UpdateUserSettingsResponseV2Dto
  extends createZodDto(userSettingsSchema)
  implements UserSettingsV2 {}
