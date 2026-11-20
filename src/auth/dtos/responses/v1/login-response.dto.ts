import { SiteRole } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { LoginResponseV1 } from 'src/auth/interfaces/auth';
import { userProfileSchemaV1 } from 'src/user/dtos/generic/v1/user.dto';

const loginResponseSchemaV1 = z.object({
  message: z.string(),
  code: z.literal(SuccessCode.USER_LOGGED_IN),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string().nullable(),
    siteRole: z.enum(SiteRole),
    settings: z.object({ theme: z.string(), language: z.string() }),
    profile: userProfileSchemaV1.nullable(),
  }),
});

export class LoginResponseDtoV1
  extends createZodDto(loginResponseSchemaV1)
  implements JsonSerialized<LoginResponseV1> {}
