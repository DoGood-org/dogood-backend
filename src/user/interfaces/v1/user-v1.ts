import { SiteRole, UserStatus } from '@prisma/client';

/**
 * Форма відповіді v1 — legacy-контракт, не змінювати.
 * Поля виписані явно (а не через Pick<User, ...>), щоб зміни в Prisma-моделі
 * не «протікали» у вже зафіксовану відповідь API.
 */
export interface UserProfileV1 {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  status: UserStatus;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserV1 {
  name?: string;
  email?: string;
  password?: string;
  role?: SiteRole;
}
