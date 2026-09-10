import { Response } from 'express';
import { CookieService } from '@shared/services/cookie.service';
import { UserControllerV2 } from 'src/user/controllers/v2/user.controller';
import {
  getUserProfilesRequestSchemaV2,
  updateMyProfileRequestSchemaV2,
  updateMySettingsRequestSchemaV2,
} from 'src/user/dtos/v2/requests';
import { UserServiceV2 } from 'src/user/services/v2/user.service';

describe('UserControllerV2', () => {
  const userService = {
    getUserProfiles: jest.fn(),
    getMyProfile: jest.fn(),
    updateMySettings: jest.fn(),
    updateMyProfile: jest.fn(),
    deleteMyProfile: jest.fn(),
    getUserProfileById: jest.fn(),
  };

  const cookieService = { clearAllCookies: jest.fn() };

  const controller = new UserControllerV2(
    userService as unknown as UserServiceV2,
    cookieService as unknown as CookieService,
  );

  const handlerOrder = Object.getOwnPropertyNames(
    UserControllerV2.prototype,
  ).filter((name) => name !== 'constructor');

  beforeEach(() => jest.resetAllMocks());

  it('should declare every my route before the :id route', () => {
    expect(handlerOrder.indexOf('getUserProfileById')).toBe(
      handlerOrder.length - 1,
    );
  });

  it('should return the profile wrapped in a bare data envelope', async () => {
    userService.getMyProfile.mockResolvedValue({ id: 'user-id' });

    const response = await controller.getMyProfile('user-id');

    expect(response).toEqual({ data: { id: 'user-id' } });
    expect(response).not.toHaveProperty('status');
    expect(response).not.toHaveProperty('code');
  });

  it('should clear both auth cookies after deleting the account', async () => {
    const response = {} as Response;

    userService.deleteMyProfile.mockResolvedValue(undefined);

    await controller.deleteMyProfile('user-id', response);

    expect(cookieService.clearAllCookies).toHaveBeenCalledWith(response, [
      'accessToken',
      'refreshToken',
    ]);
  });

  it('should strip role and stripeCustomerId from the update body', () => {
    const parsed = updateMyProfileRequestSchemaV2.parse({
      name: 'New',
      role: 'ADMIN',
      stripeCustomerId: 'cus_1',
    });

    expect(parsed).toEqual({ name: 'New' });
  });

  it('should keep an explicit null location apart from an absent one', () => {
    expect(updateMyProfileRequestSchemaV2.parse({ location: null })).toEqual({
      location: null,
    });
    expect(updateMyProfileRequestSchemaV2.parse({})).toEqual({});
  });

  it('should return the profile list in a bare data envelope', async () => {
    userService.getUserProfiles.mockResolvedValue([{ id: 'user-id' }]);

    const response = await controller.getUserProfiles({});

    expect(response).toEqual({ data: [{ id: 'user-id' }] });
    expect(response).not.toHaveProperty('total');
  });

  // NOTE: `Prisma.UserScalarFieldEnum` would let `password` and `email` through — the sort
  // whitelist is hand-written for exactly this reason.
  it('should sort only by the whitelisted fields', () => {
    expect(
      getUserProfilesRequestSchemaV2.safeParse({ sort: 'password' }).success,
    ).toBe(false);
    expect(
      getUserProfilesRequestSchemaV2.safeParse({ sort: 'email' }).success,
    ).toBe(false);
    expect(
      getUserProfilesRequestSchemaV2.safeParse({ sort: 'createdAt' }).success,
    ).toBe(true);
  });

  it('should coerce paging numbers and reject a negative limit', () => {
    expect(
      getUserProfilesRequestSchemaV2.parse({ skip: '2', limit: '5' }),
    ).toEqual({ skip: 2, limit: 5 });
    expect(
      getUserProfilesRequestSchemaV2.safeParse({ limit: '-1' }).success,
    ).toBe(false);
    expect(
      getUserProfilesRequestSchemaV2.safeParse({ skip: '-1' }).success,
    ).toBe(false);
  });

  it('should answer a settings update with the settings alone', async () => {
    const settings = { theme: 'dark', language: 'uk' };

    userService.updateMySettings.mockResolvedValue(settings);

    await expect(
      controller.updateMySettings('user-id', { language: 'uk' }),
    ).resolves.toEqual({ data: settings });
  });

  it('should reject an unsupported language tag in the settings body', () => {
    expect(
      updateMySettingsRequestSchemaV2.safeParse({ language: 'klingon' })
        .success,
    ).toBe(false);
    expect(
      updateMySettingsRequestSchemaV2.safeParse({ theme: 'neon' }).success,
    ).toBe(false);
    expect(
      updateMySettingsRequestSchemaV2.safeParse({
        theme: 'dark',
        language: 'uk',
      }).success,
    ).toBe(true);
  });
});
