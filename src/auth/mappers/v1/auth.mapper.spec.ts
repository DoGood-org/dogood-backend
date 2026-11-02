import { Gender, SiteRole, UserStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { LoginUserRowV1 } from 'src/auth/interfaces/auth';
import { AuthMapperV1 } from 'src/auth/mappers/v1/auth.mapper';

describe('AuthMapperV1', () => {
  const mapper = new AuthMapperV1();
  const birthDate = new Date('1990-05-01T00:00:00Z');
  const user: LoginUserRowV1 = {
    id: 'user-1',
    email: 'ann@b.co',
    name: 'Ann',
    role: SiteRole.ADMIN,
    password: 'hashed',
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ban: null,
    userProfile: {
      id: 'profile-1',
      userId: 'user-1',
      bio: 'Hi',
      avatar: 'https://cdn/a.png',
      gender: Gender.FEMALE,
      birthDate,
      phoneNumber: '+380671234567',
    },
    userSettings: { theme: 'dark', language: 'uk' },
  };

  describe('toLoginResponse', () => {
    it('should build the legacy login body with siteRole, settings and the full profile', () => {
      expect(mapper.toLoginResponse(user)).toEqual({
        message: 'User logged in successfully',
        code: SuccessCode.USER_LOGGED_IN,
        user: {
          id: 'user-1',
          name: 'Ann',
          email: 'ann@b.co',
          avatar: 'https://cdn/a.png',
          siteRole: SiteRole.ADMIN,
          settings: { theme: 'dark', language: 'uk' },
          profile: {
            id: 'profile-1',
            userId: 'user-1',
            bio: 'Hi',
            avatar: 'https://cdn/a.png',
            gender: Gender.FEMALE,
            birthDate,
            phoneNumber: '+380671234567',
          },
        },
      });
    });

    it('should never leak the password hash', () => {
      expect(JSON.stringify(mapper.toLoginResponse(user))).not.toContain(
        'hashed',
      );
    });

    it('should default settings to light/en and profile/avatar to null when they are missing', () => {
      const { user: loginUser } = mapper.toLoginResponse({
        ...user,
        userProfile: null,
        userSettings: null,
      });

      expect(loginUser.avatar).toBeNull();
      expect(loginUser.profile).toBeNull();
      expect(loginUser.settings).toEqual({ theme: 'light', language: 'en' });
    });

    it('should treat empty strings like missing values (legacy ||)', () => {
      const { user: loginUser } = mapper.toLoginResponse({
        ...user,
        userProfile: user.userProfile && { ...user.userProfile, avatar: '' },
        userSettings: { theme: '', language: '' },
      });

      expect(loginUser.avatar).toBeNull();
      expect(loginUser.settings).toEqual({ theme: 'light', language: 'en' });
    });
  });

  it('should put status before code in the status envelope', () => {
    expect(
      Object.keys(
        mapper.toAuthStatusResponse('Done', SuccessCode.USER_REGISTERED),
      ),
    ).toEqual(['status', 'code', 'message']);
  });

  it('should build the message envelope without status', () => {
    expect(
      mapper.toAuthMessageResponse('Done', SuccessCode.PASSWORD_CHANGED),
    ).toEqual({ message: 'Done', code: SuccessCode.PASSWORD_CHANGED });
  });

  it('should build the session from the token pair and the refresh TTL', () => {
    expect(
      mapper.toAuthSession({ accessToken: 'a', refreshToken: 'r' }, 1000),
    ).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      refreshTokenMaxAgeMs: 1000,
    });
  });
});
