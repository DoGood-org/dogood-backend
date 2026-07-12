import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Декоратор для позначення ендпоінтів як публічних (без авторизації)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
