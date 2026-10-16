import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import { TokenPair } from '@shared/services/tokens.service';
import {
  AuthMessageResponseV1,
  AuthSessionV1,
  AuthStatusResponseV1,
  CurrentUserResponseV1,
  LoginResponseV1,
  LoginUserRowV1,
} from 'src/auth/interfaces/auth';
import { FullUserV1 } from 'src/user/interfaces/user';

@Injectable()
export class AuthMapperV1 {
  toAuthMessageResponse(
    message: string,
    code: SuccessCode,
  ): AuthMessageResponseV1 {
    return { message, code };
  }

  toAuthStatusResponse(
    message: string,
    code: SuccessCode,
  ): AuthStatusResponseV1 {
    return { status: 'success', code, message };
  }

  toLoginResponse(user: LoginUserRowV1): LoginResponseV1 {
    const { id, name, email, role, userProfile, userSettings } = user;

    // NOTE: `||` is the legacy formatter: empty strings fall back too.
    return {
      message: 'User logged in successfully',
      code: SuccessCode.USER_LOGGED_IN,
      user: {
        id,
        name,
        email,
        avatar: userProfile?.avatar || null,
        siteRole: role,
        settings: {
          theme: userSettings?.theme || 'light',
          language: userSettings?.language || 'en',
        },
        profile:
          userProfile === null
            ? null
            : {
                id: userProfile.id,
                userId: userProfile.userId,
                bio: userProfile.bio,
                avatar: userProfile.avatar,
                gender: userProfile.gender,
                birthDate: userProfile.birthDate,
                phoneNumber: userProfile.phoneNumber,
              },
      },
    };
  }

  toCurrentUserResponse(user: FullUserV1 | null): CurrentUserResponseV1 {
    return {
      status: 'success',
      message: 'User data retrieved',
      code: SuccessCode.USER_DATA_RETRIEVED,
      user,
    };
  }

  toAuthSession(
    tokens: TokenPair,
    refreshTokenMaxAgeMs: number,
  ): AuthSessionV1 {
    const { accessToken, refreshToken } = tokens;

    return { accessToken, refreshToken, refreshTokenMaxAgeMs };
  }
}
