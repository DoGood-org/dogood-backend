import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_AUTH_V1_KEY = 'isAuthV1';

/**
 * Marks a v1 controller whose non-public routes go through the legacy `authenticateUser` port
 * (`AuthV1Guard`) instead of the global `AuthGuard`.
 */
export const AuthV1 = (): CustomDecorator<string> =>
  SetMetadata(IS_AUTH_V1_KEY, true);
