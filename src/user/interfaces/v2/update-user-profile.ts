import { Gender } from '@prisma/client';

export interface UpdateUserLocationV2 {
  country?: string;
  region?: string;
  city?: string;
}

/**
 * Вхід сервісу на оновлення профілю. Усі поля опційні — оновлюємо лише передані.
 * `location: null` очищає локацію, `undefined` — лишає як є.
 */
export interface UpdateUserProfileV2 {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  gender?: Gender;
  birthDate?: Date;
  phoneNumber?: string;
  location?: UpdateUserLocationV2 | null;
}
