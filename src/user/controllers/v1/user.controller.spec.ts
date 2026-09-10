import { SuccessCode } from '@shared/constants/api-codes';
import { UserControllerV1 } from 'src/user/controllers/v1/user.controller';
import {
  searchUsersByNameRequestSchemaV1,
  updateUserProfileRequestSchemaV1,
  updateUserSettingsRequestSchemaV1,
} from 'src/user/dtos/v1/requests';
import {
  PublicUserProfileV1,
  UserProfileV1,
} from 'src/user/interfaces/v1/user';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

describe('UserControllerV1', () => {
  const userService = {
    getUserProfileById: jest.fn(),
    getPublicUserProfileById: jest.fn(),
    updateMyProfile: jest.fn(),
    updateMySettings: jest.fn(),
    deleteMyProfile: jest.fn(),
    searchUsersByName: jest.fn(),
  };

  const controller = new UserControllerV1(
    userService as unknown as UserServiceV1,
  );

  const handlerOrder = Object.getOwnPropertyNames(
    UserControllerV1.prototype,
  ).filter((name) => name !== 'constructor');

  beforeEach(() => jest.resetAllMocks());

  it('should declare profile/public/:id before profile/:id', () => {
    expect(handlerOrder.indexOf('getPublicUserProfileById')).toBeLessThan(
      handlerOrder.indexOf('getUserProfileById'),
    );
  });

  it('should wrap a profile in the legacy success envelope', async () => {
    const user = { id: 'user-id' } as unknown as UserProfileV1;

    userService.getUserProfileById.mockResolvedValue(user);

    await expect(controller.getUserProfileById('user-id')).resolves.toEqual({
      status: 'success',
      code: SuccessCode.USER_PROFILE_RETRIEVED,
      data: { user },
    });
  });

  it('should report the same success code for the public profile', async () => {
    const user = { id: 'user-id' } as unknown as PublicUserProfileV1;

    userService.getPublicUserProfileById.mockResolvedValue(user);

    await expect(
      controller.getPublicUserProfileById('user-id'),
    ).resolves.toMatchObject({ code: SuccessCode.USER_PROFILE_RETRIEVED });
  });

  it('should answer an update with USER_PROFILE_UPDATED', async () => {
    userService.updateMyProfile.mockResolvedValue({});

    await expect(
      controller.updateMyProfile('user-id', { name: 'New' }),
    ).resolves.toMatchObject({ code: SuccessCode.USER_PROFILE_UPDATED });
  });

  it('should answer a delete without a data key', async () => {
    userService.deleteMyProfile.mockResolvedValue(undefined);

    const response = await controller.deleteMyProfile('user-id');

    expect(response).toEqual({
      status: 'success',
      code: SuccessCode.USER_DELETED,
    });
    expect(response).not.toHaveProperty('data');
  });

  it('should reject a malformed phone number and a future birth date', () => {
    expect(
      updateUserProfileRequestSchemaV1.safeParse({ phoneNumber: 'abc' })
        .success,
    ).toBe(false);
    expect(
      updateUserProfileRequestSchemaV1.safeParse({ birthDate: '2999-01-01' })
        .success,
    ).toBe(false);
  });

  it('should accept an empty avatar string, as the legacy schema did', () => {
    expect(
      updateUserProfileRequestSchemaV1.safeParse({ avatar: '' }).success,
    ).toBe(true);
  });

  it('should keep stripeCustomerId, which the legacy update schema accepted', () => {
    const parsed = updateUserProfileRequestSchemaV1.parse({
      stripeCustomerId: 'cus_1',
    });

    expect(parsed.stripeCustomerId).toBe('cus_1');
  });

  it('should strip role from the update body', () => {
    expect(
      updateUserProfileRequestSchemaV1.parse({ role: 'ADMIN' }),
    ).not.toHaveProperty('role');
  });

  it('should answer a settings update with the stored settings, not an empty object', async () => {
    const settings = { theme: 'dark', language: 'uk' };

    userService.updateMySettings.mockResolvedValue(settings);

    await expect(
      controller.updateMySettings('user-id', { language: 'uk' }),
    ).resolves.toEqual({
      status: 'success',
      code: SuccessCode.USER_SETTINGS_UPDATED,
      data: { settings },
    });
  });

  it('should reject an unknown theme and an out-of-range language tag', () => {
    expect(
      updateUserSettingsRequestSchemaV1.safeParse({ theme: 'neon' }).success,
    ).toBe(false);
    expect(
      updateUserSettingsRequestSchemaV1.safeParse({ language: 'x' }).success,
    ).toBe(false);
    expect(
      updateUserSettingsRequestSchemaV1.safeParse({ language: 'toolong' })
        .success,
    ).toBe(false);
    expect(updateUserSettingsRequestSchemaV1.safeParse({}).success).toBe(true);
  });

  it('should report the two search messages on the empty and non-empty branch', async () => {
    userService.searchUsersByName.mockResolvedValue([]);

    await expect(
      controller.searchUsersByName({ name: 'nobody' }),
    ).resolves.toEqual({
      status: 'success',
      code: SuccessCode.USER_DATA_RETRIEVED,
      message: 'No users found with this name',
      data: { users: [] },
    });

    const users = [{ id: 'user-id', name: 'Ivan', avatar: null }];

    userService.searchUsersByName.mockResolvedValue(users);

    await expect(controller.searchUsersByName({ name: 'Iv' })).resolves.toEqual(
      {
        status: 'success',
        code: SuccessCode.USER_DATA_RETRIEVED,
        message: 'Users retrieved successfully',
        data: { users },
      },
    );
  });

  // NOTE: the legacy schema left `name` optional, so an empty body reaches the service and is
  // rejected there with VALIDATION_ERROR instead of failing validation with a null code.
  it('should let an empty search body through validation', () => {
    expect(searchUsersByNameRequestSchemaV1.safeParse({}).success).toBe(true);
    expect(
      searchUsersByNameRequestSchemaV1.safeParse({ name: '' }).success,
    ).toBe(false);
  });
});
