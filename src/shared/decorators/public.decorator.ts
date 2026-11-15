import { applyDecorators, SetMetadata } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Декоратор для позначення ендпоінтів як публічних (без авторизації)
 */
// NOTE: [{}] ("no auth required" in OpenAPI) overrides the global cookie requirement from setupSwagger; a bare []
// would be dropped by @nestjs/swagger on methods. setupSwagger normalizes it to [] so the UI shows no lock.
export const Public = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(DECORATORS.API_SECURITY, [{}]),
  );
