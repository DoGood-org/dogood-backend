import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  AuthMessageResponseV1,
  AuthStatusResponseV1,
} from 'src/auth/interfaces/auth';

const authMessageResponseSchemaV1 = z.object({
  message: z.string(),
  code: z.enum([
    SuccessCode.EMAIL_ALREADY_VERIFIED,
    SuccessCode.EMAIL_RESEND_SUCCESS,
    SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
    SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    SuccessCode.PASSWORD_CHANGED,
  ]),
});

const authStatusResponseSchemaV1 = z.object({
  status: z.literal('success'),
  message: z.string(),
  code: z.enum([
    SuccessCode.USER_REGISTERED,
    SuccessCode.EMAIL_ALREADY_VERIFIED,
    SuccessCode.EMAIL_VERIFICATION_SUCCESS,
  ]),
});

export class AuthMessageResponseDtoV1
  extends createZodDto(authMessageResponseSchemaV1)
  implements JsonSerialized<AuthMessageResponseV1> {}

export class AuthStatusResponseDtoV1
  extends createZodDto(authStatusResponseSchemaV1)
  implements JsonSerialized<AuthStatusResponseV1> {}
