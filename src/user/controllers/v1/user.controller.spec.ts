import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { UserControllerV1 } from 'src/user/controllers/v1/user.controller';

describe('UserControllerV1', () => {
  const metadataOf = (key: string, name: keyof UserControllerV1): unknown =>
    Reflect.getMetadata(
      key,
      Object.getOwnPropertyDescriptor(UserControllerV1.prototype, name)
        ?.value,
    );

  it('should mount at the legacy /user path, version 1', () => {
    expect(Reflect.getMetadata(PATH_METADATA, UserControllerV1)).toBe('user');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, UserControllerV1)).toBe(
      undefined,
    );
  });

  it.each<[keyof UserControllerV1, RequestMethod, string]>([
    ['getPublicUserProfileById', RequestMethod.GET, 'profile/public/:id'],
    ['getUserProfileById', RequestMethod.GET, 'profile/:id'],
  ])(
    'should keep %s public (legacy had no authenticateUser)',
    (name, method, path) => {
      expect(metadataOf(IS_PUBLIC_KEY, name)).toBe(true);
      expect(metadataOf(METHOD_METADATA, name)).toBe(method);
      expect(metadataOf(PATH_METADATA, name)).toBe(path);
      expect(metadataOf(HTTP_CODE_METADATA, name)).toBe(HttpStatus.OK);
    },
  );

  it.each<[keyof UserControllerV1, RequestMethod, string]>([
    ['updateMyProfile', RequestMethod.PATCH, 'profile'],
    ['updateMySettings', RequestMethod.PATCH, 'settings'],
    ['deleteMyProfile', RequestMethod.DELETE, 'profile'],
    ['searchUsersByName', RequestMethod.POST, 'name'],
  ])('should keep %s behind auth', (name, method, path) => {
    expect(metadataOf(IS_PUBLIC_KEY, name)).toBe(undefined);
    expect(metadataOf(METHOD_METADATA, name)).toBe(method);
    expect(metadataOf(PATH_METADATA, name)).toBe(path);
    expect(metadataOf(HTTP_CODE_METADATA, name)).toBe(HttpStatus.OK);
  });

  it('should declare profile/public/:id before profile/:id', () => {
    const names = Object.getOwnPropertyNames(UserControllerV1.prototype);

    expect(names.indexOf('getPublicUserProfileById')).toBeLessThan(
      names.indexOf('getUserProfileById'),
    );
  });
});
