import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserResponseV1 } from 'src/user/interfaces/user';

// NOTE: legacy answers an always-empty `settings` object.
const updateMySettingsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.USER_SETTINGS_UPDATED),
  data: z.object({ settings: z.object({}).strict() }),
});

export class UpdateMySettingsResponseDtoV1
  extends createZodDto(updateMySettingsResponseSchemaV1)
  implements
    JsonSerialized<UserResponseV1<{ settings: Record<string, never> }>> {}
