import { Gender, Prisma, SiteRole } from '@prisma/client';

const locationSelectV2 = {
  id: true,
  country: true,
  region: true,
  city: true,
} satisfies Prisma.LocationSelect;

export const userProfileSelectV2 = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  userProfile: {
    select: {
      bio: true,
      avatar: true,
      gender: true,
      birthDate: true,
      phoneNumber: true,
    },
  },
  location: { select: locationSelectV2 },
  userSettings: { select: { theme: true, language: true } },
} satisfies Prisma.UserSelect;

export const publicUserProfileSelectV2 = {
  id: true,
  name: true,
  createdAt: true,
  userProfile: { select: { bio: true, avatar: true, gender: true } },
  location: { select: locationSelectV2 },
} satisfies Prisma.UserSelect;

export type UserProfileRowV2 = Prisma.UserGetPayload<{
  select: typeof userProfileSelectV2;
}>;

export type PublicUserProfileRowV2 = Prisma.UserGetPayload<{
  select: typeof publicUserProfileSelectV2;
}>;

export type UserLocationV2 = Prisma.LocationGetPayload<{
  select: typeof locationSelectV2;
}>;

export interface UserSettingsV2 {
  theme: string;
  language: string;
}

export interface UserProfileV2 {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  isEmailVerified: boolean;
  createdAt: Date;
  bio: string | null;
  avatar: string | null;
  gender: Gender | null;
  birthDate: Date | null;
  phoneNumber: string | null;
  location: UserLocationV2 | null;
  settings: UserSettingsV2 | null;
}

export interface PublicUserProfileV2 {
  id: string;
  name: string;
  createdAt: Date;
  bio: string | null;
  avatar: string | null;
  gender: Gender | null;
  location: UserLocationV2 | null;
}

/**
 * Sort whitelist of the profile list. Hand-written on purpose: `Prisma.UserScalarFieldEnum`
 * is every column, `password` included.
 */
export enum UserSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export enum UserSettingsThemeV2 {
  LIGHT = 'light',
  DARK = 'dark',
}

/** Every field is optional — the defaults live in the service destructure. */
export interface GetUserProfilesV2 {
  search?: string;
  sort?: UserSortField;
  sortDirection?: Prisma.SortOrder;
  skip?: number;
  limit?: number;
}

export interface UpdateMySettingsV2 {
  theme?: UserSettingsThemeV2;
  language?: string;
}

export interface UpdateMyProfileV2 {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  gender?: Gender | null;
  birthDate?: Date | null;
  phoneNumber?: string | null;
  location?: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
  } | null;
}
