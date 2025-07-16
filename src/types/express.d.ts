// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    user?: Omit<
      User,
      | 'password'
      | 'emailVerificationCode'
      | 'emailVerificationExpiresAt'
      | 'resetPasswordToken'
      | 'resetPasswordExpiresAt'
    >;
  }
}
