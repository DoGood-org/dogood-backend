import { SiteRole, UserStatus } from '@prisma/client';

export interface LegacyUserBan {
  banType: string;
  banReason: string | null;
  banExpiresAt: Date | null;
}

export interface LegacyUserProfile {
  id: string;
  bio: string | null;
  avatar: string | null;
  gender: string | null;
  birthDate: Date | null;
  phoneNumber: string | null;
}

export interface LegacyUserSettings {
  theme: string;
  language: string;
}

export interface LegacyUser {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  status: UserStatus;
  isEmailVerified: boolean;
  password?: string;
  createdAt: Date;
  ban: LegacyUserBan | null;
  userProfile: LegacyUserProfile | null;
  userSettings: LegacyUserSettings | null;
}
