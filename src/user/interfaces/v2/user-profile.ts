import { Gender, SiteRole } from '@prisma/client';
import { UserSettingsV2 } from 'src/user/interfaces/v2/user-settings';

export interface UserLocationV2 {
  id: string;
  country: string | null;
  region: string | null;
  city: string | null;
}

export interface UserProfileDetailsV2 {
  bio: string | null;
  avatar: string | null;
  gender: Gender | null;
  birthDate: Date | null;
  phoneNumber: string | null;
}

/** Приватний профіль — те, що бачить сам власник акаунта. */
export interface UserProfileV2 {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  isEmailVerified: boolean;
  createdAt: Date;
  profile: UserProfileDetailsV2 | null;
  settings: UserSettingsV2 | null;
  location: UserLocationV2 | null;
}

/** Публічний профіль — без email, ролі та статусу верифікації. */
export interface PublicUserProfileV2 {
  id: string;
  name: string;
  createdAt: Date;
  profile: Pick<UserProfileDetailsV2, 'bio' | 'avatar' | 'gender'> | null;
  location: UserLocationV2 | null;
}
