import { findUserByIdService } from '@/services/auth.service';

type ExtendedUser = Awaited<ReturnType<typeof findUserByIdService>>;

export const sanitizeUser = (user: ExtendedUser) => {
  if (!user) return null;
  
  const safeUser: Partial<ExtendedUser> = { ...user };

  delete safeUser.password;
  delete safeUser.emailVerificationCode;
  delete safeUser.emailVerificationExpiresAt;
  delete safeUser.resetPasswordToken;
  delete safeUser.resetPasswordExpiresAt;

  return safeUser;
};
