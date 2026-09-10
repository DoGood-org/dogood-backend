import { Injectable } from '@nestjs/common';
import {
  PublicUserProfileRowV2,
  PublicUserProfileV2,
  UserProfileRowV2,
  UserProfileV2,
} from 'src/user/interfaces/v2/user';

@Injectable()
export class UserDataMapperV2 {
  toUserProfile(row: UserProfileRowV2): UserProfileV2 {
    const {
      id,
      email,
      name,
      role,
      isEmailVerified,
      createdAt,
      userProfile,
      location,
      userSettings,
    } = row;

    return {
      id,
      email,
      name,
      role,
      isEmailVerified,
      createdAt,
      bio: userProfile?.bio ?? null,
      avatar: userProfile?.avatar ?? null,
      gender: userProfile?.gender ?? null,
      birthDate: userProfile?.birthDate ?? null,
      phoneNumber: userProfile?.phoneNumber ?? null,
      location,
      settings: userSettings,
    };
  }

  toPublicUserProfile(row: PublicUserProfileRowV2): PublicUserProfileV2 {
    const { id, name, createdAt, userProfile, location } = row;

    return {
      id,
      name,
      createdAt,
      bio: userProfile?.bio ?? null,
      avatar: this.toPublicAvatar(userProfile?.avatar ?? null),
      gender: userProfile?.gender ?? null,
      location,
    };
  }

  /**
   * NOTE: the column is shared with the frozen v1, whose schema accepts any URI scheme,
   * so the protocol whitelist of the v2 write schema does not hold on read. Anything that
   * is not an http(s) URL is dropped here, before it reaches an anonymous caller of
   * `GET /api/v2/users/:id` or `GET /api/v2/users`.
   */
  private toPublicAvatar(avatar: string | null): string | null {
    if (avatar === null || avatar === '') {
      return avatar;
    }

    try {
      const { protocol } = new URL(avatar);

      return protocol === 'http:' || protocol === 'https:' ? avatar : null;
    } catch {
      return null;
    }
  }
}
