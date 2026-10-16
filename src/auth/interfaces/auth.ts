import { BlockType, SiteRole, UserStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { FullUserV1, UserProfileV1 } from 'src/user/interfaces/user';

// ---------- request data ----------

export interface SignupDataV1 {
  name: string;
  email: string;
  password: string;
}

export interface LoginDataV1 {
  email: string;
  password: string;
}

export interface AuthEmailDataV1 {
  email: string;
}

export interface ResetPasswordDataV1 {
  password: string;
}

export interface AuthClientDataV1 {
  ip?: string;
  userAgent?: string;
}

// ---------- prisma rows ----------

export interface UserBanRowV1 {
  banType: BlockType;
  banReason: string | null;
  banExpiresAt: Date | null;
}

export interface BanCheckRowV1 {
  id: string;
  status: UserStatus;
  createdAt: Date;
  ban: UserBanRowV1 | null;
}

export interface LoginUserRowV1 extends BanCheckRowV1 {
  email: string;
  name: string;
  role: SiteRole;
  password: string;
  isEmailVerified: boolean;
  userProfile: {
    id: string;
    userId: string;
    bio: string | null;
    avatar: string | null;
    gender: UserProfileV1['gender'];
    birthDate: Date | null;
    phoneNumber: string | null;
  } | null;
  userSettings: { theme: string; language: string } | null;
}

// ---------- results ----------

export interface AuthSessionV1 {
  accessToken: string;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
}

export interface AuthMessageResponseV1 {
  message: string;
  code: SuccessCode;
}

export interface AuthStatusResponseV1 extends AuthMessageResponseV1 {
  status: 'success';
}

export interface LoginUserV1 {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  siteRole: SiteRole;
  settings: { theme: string; language: string };
  profile: UserProfileV1 | null;
}

export interface LoginResponseV1 extends AuthMessageResponseV1 {
  user: LoginUserV1;
}

export interface LoginResultV1 {
  response: LoginResponseV1;
  session: AuthSessionV1;
}

export interface RefreshTokensResultV1 {
  response: AuthMessageResponseV1;
  // NOTE: null on the legacy "already refreshed" answer — no cookies are set then.
  session: AuthSessionV1 | null;
}

export interface CurrentUserResponseV1 extends AuthStatusResponseV1 {
  user: FullUserV1 | null;
}
