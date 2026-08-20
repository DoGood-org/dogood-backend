import { Injectable } from '@nestjs/common';
import { SiteRole } from '@prisma/client';
import {
  PublicUserProfileV2,
  UserLocationV2,
  UserProfileDetailsV2,
  UserProfileV2,
} from 'src/user/interfaces/v2/user-profile';
import { UserSettingsV2 } from 'src/user/interfaces/v2/user-settings';
import { UserV2 } from 'src/user/interfaces/v2/get-user-profiles';

type UserProfileRow = {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  isEmailVerified: boolean;
  createdAt: Date;
  userProfile: UserProfileDetailsV2 | null;
  userSettings: UserSettingsV2 | null;
  location: UserLocationV2 | null;
};

type PublicUserProfileRow = {
  id: string;
  name: string;
  createdAt: Date;
  userProfile: Pick<UserProfileDetailsV2, 'bio' | 'avatar' | 'gender'> | null;
  location: UserLocationV2 | null;
};

type UserRow = {
  id: string;
  name: string;
  userProfile: { avatar: string | null } | null;
};

/** Prisma-рядок → інтерфейс відповіді v2. */
@Injectable()
export class UserV2Mapper {
  toProfile(row: UserProfileRow): UserProfileV2 {
    const {
      id,
      email,
      name,
      role,
      isEmailVerified,
      createdAt,
      userProfile,
      userSettings,
      location,
    } = row;

    return {
      id,
      email,
      name,
      role,
      isEmailVerified,
      createdAt,
      profile: userProfile,
      settings: userSettings,
      location,
    };
  }

  toPublicProfile(row: PublicUserProfileRow): PublicUserProfileV2 {
    const { id, name, createdAt, userProfile, location } = row;

    return { id, name, createdAt, profile: userProfile, location };
  }

  toUser(row: UserRow): UserV2 {
    const { id, name, userProfile } = row;

    return { id, name, avatar: userProfile?.avatar ?? null };
  }
}
