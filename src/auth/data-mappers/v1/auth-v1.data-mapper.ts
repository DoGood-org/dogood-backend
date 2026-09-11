import { Injectable } from '@nestjs/common';
import { LegacyUser } from '@/auth/interfaces/v1/auth';

@Injectable()
export class AuthV1DataMapper {
  toLoginUserResponse(user: LegacyUser) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.userProfile?.avatar ?? null,
      siteRole: user.role,
      settings: {
        theme: user.userSettings?.theme ?? 'light',
        language: user.userSettings?.language ?? 'en',
      },
      profile: user.userProfile,
    };
  }

  toCurrentUserResponse(user: LegacyUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      userProfile: user.userProfile,
      userSettings: user.userSettings,
    };
  }
}
