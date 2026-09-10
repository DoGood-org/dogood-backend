import { Gender, SiteRole } from '@prisma/client';
import { UserDataMapperV2 } from 'src/user/data-mappers/v2/user.data-mapper';
import {
  PublicUserProfileRowV2,
  UserProfileRowV2,
} from 'src/user/interfaces/v2/user';

const now = new Date('2026-08-01T00:00:00.000Z');

const location = {
  id: 'location-id',
  country: 'Ukraine',
  region: 'Kyiv',
  city: 'Kyiv',
};

const row: UserProfileRowV2 = {
  id: 'user-id',
  email: 'user@example.com',
  name: 'User',
  role: SiteRole.USER,
  isEmailVerified: true,
  createdAt: now,
  userProfile: {
    bio: 'bio',
    avatar: 'https://example.com/a.png',
    gender: Gender.OTHER,
    birthDate: now,
    phoneNumber: '+380000000000',
  },
  location,
  userSettings: { theme: 'dark', language: 'uk' },
};

describe('UserDataMapperV2', () => {
  const mapper = new UserDataMapperV2();

  it('should flatten the profile relation into the response root', () => {
    expect(mapper.toUserProfile(row)).toEqual({
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      role: SiteRole.USER,
      isEmailVerified: true,
      createdAt: now,
      bio: 'bio',
      avatar: 'https://example.com/a.png',
      gender: Gender.OTHER,
      birthDate: now,
      phoneNumber: '+380000000000',
      location,
      settings: { theme: 'dark', language: 'uk' },
    });
  });

  it('should null out the profile fields when the user has no profile row', () => {
    const profile = mapper.toUserProfile({
      ...row,
      userProfile: null,
      location: null,
      userSettings: null,
    });

    expect(profile).toMatchObject({
      bio: null,
      avatar: null,
      gender: null,
      birthDate: null,
      phoneNumber: null,
      location: null,
      settings: null,
    });
  });

  it('should keep email, settings, phone and birth date out of the public profile', () => {
    const publicRow: PublicUserProfileRowV2 = {
      id: 'user-id',
      name: 'User',
      createdAt: now,
      userProfile: { bio: 'bio', avatar: null, gender: Gender.OTHER },
      location,
    };

    const profile = mapper.toPublicUserProfile(publicRow);

    expect(profile).toEqual({
      id: 'user-id',
      name: 'User',
      createdAt: now,
      bio: 'bio',
      avatar: null,
      gender: Gender.OTHER,
      location,
    });
  });

  it('should keep http and https avatars of the public profile as they are', () => {
    const publicRow: PublicUserProfileRowV2 = {
      id: 'user-id',
      name: 'User',
      createdAt: now,
      userProfile: {
        bio: null,
        avatar: 'https://example.com/a.png',
        gender: null,
      },
      location: null,
    };

    expect(mapper.toPublicUserProfile(publicRow).avatar).toBe(
      'https://example.com/a.png',
    );

    expect(
      mapper.toPublicUserProfile({
        ...publicRow,
        userProfile: {
          bio: null,
          avatar: 'http://example.com/a.png',
          gender: null,
        },
      }).avatar,
    ).toBe('http://example.com/a.png');
  });

  it('should drop a non-http(s) avatar written through the frozen v1', () => {
    const publicRow: PublicUserProfileRowV2 = {
      id: 'user-id',
      name: 'User',
      createdAt: now,
      userProfile: { bio: null, avatar: null, gender: null },
      location: null,
    };

    const dropped = [
      'javascript:alert(document.domain)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'file:///etc/passwd',
      'ftp://example.com/a.png',
      'not-a-url',
    ];

    for (const avatar of dropped) {
      expect(
        mapper.toPublicUserProfile({
          ...publicRow,
          userProfile: { bio: null, avatar, gender: null },
        }).avatar,
      ).toBeNull();
    }
  });

  it('should keep an empty avatar string of the public profile as an empty string', () => {
    const profile = mapper.toPublicUserProfile({
      id: 'user-id',
      name: 'User',
      createdAt: now,
      userProfile: { bio: null, avatar: '', gender: null },
      location: null,
    });

    expect(profile.avatar).toBe('');
  });

  it('should leave the avatar of the own full profile untouched', () => {
    const profile = mapper.toUserProfile({
      ...row,
      userProfile: {
        bio: 'bio',
        avatar: 'javascript:alert(1)',
        gender: Gender.OTHER,
        birthDate: now,
        phoneNumber: '+380000000000',
      },
    });

    expect(profile.avatar).toBe('javascript:alert(1)');
  });
});
