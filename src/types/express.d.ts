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
    > & {
      userSettings?: UserSettings | null;
      hostedTasks?: Task[];
      joinedTasks?: Task[];
      reviewsWritten?: Review[];
      reviewsReceived?: Review[];
      organizations?: (UserOrganization & {
        organization: {
          id: string;
          name: string;
          createdAt: Date;
        };
      })[];
      location?: Location | null;
      paymentOptions?: PaymentOption[];
    };
  }
}
