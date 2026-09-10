import {
  Gender,
  MembershipStatus,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

/**
 * NOTE: Prisma selects for the v1 user profile. Legacy used `include` of whole rows plus
 * `sanitizeUser` to strip private fields afterwards (develop:src/utils/sanitizeUser.ts);
 * the same client-visible result is reached here by naming the fields up front.
 * NOTE: field names follow the current prisma/schema.prisma; the response keys that the
 * legacy contract pins down explicitly (`avatar` for an organization, the merged `tasks`)
 * are produced by the data-mapper.
 */

const taskSelectV1 = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  hostId: true,
  startDate: true,
  endDate: true,
  locationId: true,
  amount: true,
  currentAmount: true,
  currency: true,
  requirements: true,
  status: true,
  categories: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

/**
 * NOTE: legacy read whole review rows (`reviewsWrittenUser: true`, `reviewsReceived: true`,
 * develop:src/services/user.service.ts:45-46). The columns missing here (targetType,
 * targetOrganizationId, platformId, taskId) are gone from the schema; every legacy column
 * that survived is selected.
 */
const userReviewSelectV1 = {
  id: true,
  rating: true,
  comment: true,
  authorType: true,
  authorUserId: true,
  authorOrganizationId: true,
  targetUserId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserReviewSelect;

/**
 * NOTE: the two endpoints selected different organization columns in legacy, and the two
 * payloads differ because of it — see ADR-0007. The full profile spread the organization row
 * as it stood (develop:src/helpers/user.mapper.ts:4), so `createdAt` and `_count` reached the
 * client; the public one was remapped by `sanitizeUser` into `membersCount` and never selected
 * `createdAt` (develop:src/services/user.service.ts:155-165).
 */
const fullOrganizationMembershipSelectV1 = {
  role: true,
  status: true,
  createdAt: true,
  organization: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      description: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  },
} satisfies Prisma.UserOrganizationSelect;

const publicOrganizationMembershipSelectV1 = {
  role: true,
  status: true,
  createdAt: true,
  organization: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      description: true,
      _count: { select: { members: true } },
    },
  },
} satisfies Prisma.UserOrganizationSelect;

const userProfileSelectV1 = {
  id: true,
  userId: true,
  bio: true,
  avatar: true,
  gender: true,
  birthDate: true,
  phoneNumber: true,
} satisfies Prisma.UserProfileSelect;

const locationSelectV1 = {
  id: true,
  country: true,
  region: true,
  city: true,
} satisfies Prisma.LocationSelect;

export const fullUserSelectV1 = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  status: true,
  locationId: true,
  stripeCustomerId: true,
  createdAt: true,
  updatedAt: true,
  userSettings: {
    select: { id: true, userId: true, theme: true, language: true },
  },
  userProfile: { select: userProfileSelectV1 },
  location: { select: locationSelectV1 },
  userReviewsWritten: { select: userReviewSelectV1 },
  reviewsReceived: { select: userReviewSelectV1 },
  organizations: { select: fullOrganizationMembershipSelectV1 },
  hostProfile: { select: { tasks: { select: taskSelectV1 } } },
  taskParticipations: { select: { task: { select: taskSelectV1 } } },
} satisfies Prisma.UserSelect;

export const publicUserSelectV1 = {
  id: true,
  name: true,
  createdAt: true,
  userProfile: { select: userProfileSelectV1 },
  location: { select: locationSelectV1 },
  reviewsReceived: {
    select: {
      ...userReviewSelectV1,
      authorUser: {
        select: { name: true, userProfile: { select: { avatar: true } } },
      },
    },
  },
  organizations: { select: publicOrganizationMembershipSelectV1 },
  hostProfile: { select: { tasks: { select: taskSelectV1 } } },
  taskParticipations: { select: { task: { select: taskSelectV1 } } },
} satisfies Prisma.UserSelect;

/**
 * NOTE: port of the legacy search select (develop:src/services/user.service.ts:308-330),
 * with `profile` renamed to the current schema's `userProfile`.
 */
export const userSearchSelectV1 = {
  id: true,
  name: true,
  userProfile: { select: { avatar: true } },
} satisfies Prisma.UserSelect;

export type FullUserRowV1 = Prisma.UserGetPayload<{
  select: typeof fullUserSelectV1;
}>;

export type UserSearchRowV1 = Prisma.UserGetPayload<{
  select: typeof userSearchSelectV1;
}>;

export type PublicUserRowV1 = Prisma.UserGetPayload<{
  select: typeof publicUserSelectV1;
}>;

export type UserTaskV1 = Prisma.TaskGetPayload<{ select: typeof taskSelectV1 }>;

export type PublicUserReviewReceivedRowV1 =
  PublicUserRowV1['reviewsReceived'][number];

/** The author's profile keeps the legacy key `profile` (user.service.ts:147). */
export type PublicUserReviewReceivedV1 = Omit<
  PublicUserReviewReceivedRowV1,
  'authorUser'
> & {
  authorUser: {
    name: string;
    profile: { avatar: string | null } | null;
  } | null;
};

export type FullOrganizationMembershipRowV1 =
  Prisma.UserOrganizationGetPayload<{
    select: typeof fullOrganizationMembershipSelectV1;
  }>;

export type PublicOrganizationMembershipRowV1 =
  Prisma.UserOrganizationGetPayload<{
    select: typeof publicOrganizationMembershipSelectV1;
  }>;

export interface TaskParticipationRowV1 {
  task: UserTaskV1;
}

/**
 * Membership as the full profile spread it: the organization row itself plus the three
 * membership fields (develop:src/helpers/user.mapper.ts:4). `sanitizeUser` left this shape
 * alone because `entry.organization` was already gone by then
 * (develop:src/utils/sanitizeUser.ts:21-22), so `_count` survived and `membersCount` never
 * appeared. The response key stays `avatar` while the column is `Organization.avatarUrl`.
 */
export interface UserOrganizationV1 {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  createdAt: Date;
  _count: { members: number };
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: Date;
}

/** Membership as `sanitizeUser` remapped it for the public profile (sanitizeUser.ts:20-33). */
export interface PublicUserOrganizationV1 {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  joinedAt: Date;
  membersCount: number;
}

/**
 * NOTE: `profile` and `reviewsWrittenUser` are the legacy response keys
 * (develop:src/services/user.service.ts:40-47); the selects above keep the names of the
 * current schema and the data-mapper renames them — see ADR-0007.
 */
type WithFlattenedRelationsV1<
  TRow extends { userProfile: unknown },
  TOrganization,
> = Omit<
  TRow,
  'organizations' | 'hostProfile' | 'taskParticipations' | 'userProfile'
> & {
  profile: TRow['userProfile'];
  organizations: TOrganization[];
  tasks: UserTaskV1[];
};

export type UserProfileV1 = Omit<
  WithFlattenedRelationsV1<FullUserRowV1, UserOrganizationV1>,
  'userReviewsWritten'
> & {
  reviewsWrittenUser: FullUserRowV1['userReviewsWritten'];
};

export type PublicUserProfileV1 = Omit<
  WithFlattenedRelationsV1<PublicUserRowV1, PublicUserOrganizationV1>,
  'reviewsReceived'
> & {
  reviewsReceived: PublicUserReviewReceivedV1[];
};

/**
 * NOTE: legacy success envelope, develop:src/controllers/userProfile.controller.ts:31-35.
 * v1 never uses `ResponseWrapper`.
 */
export interface SuccessEnvelopeV1<TData> {
  status: 'success';
  code: SuccessCode;
  data: TData;
}

/** NOTE: delete answers without a `data` key at all (userProfile.controller.ts:126-129). */
export interface DeleteUserEnvelopeV1 {
  status: 'success';
  code: SuccessCode;
}

/**
 * NOTE: the search endpoint is the only one carrying a `message`, and it carries it on both
 * branches (develop:src/controllers/userProfile.controller.ts:151-166).
 */
export interface SearchUsersEnvelopeV1 {
  status: 'success';
  code: SuccessCode;
  message: string;
  data: { users: UserSearchResultV1[] };
}

/** Element of the legacy search payload (userProfile.controller.ts:161-165). */
export interface UserSearchResultV1 {
  id: string;
  name: string;
  avatar: string | null;
}

/** Port of develop:src/schemas/user.schema.ts:55 `theme: z.enum(['light', 'dark'])`. */
export enum UserSettingsThemeV1 {
  LIGHT = 'light',
  DARK = 'dark',
}

/** Port of develop:src/schemas/user.schema.ts:54 `updateUserSettingsSchema`. */
export interface UpdateUserSettingsV1 {
  theme?: UserSettingsThemeV1;
  language?: string;
}

/** Port of develop:src/schemas/user.schema.ts:59 `getUserNameSchema` — `name` is optional. */
export interface SearchUsersByNameV1 {
  name?: string;
}

/** `UserSettings.theme` and `.language` are plain `String` columns with defaults. */
export interface UserSettingsV1 {
  theme: string;
  language: string;
}

/** Port of develop:src/services/user.service.ts:14-24 `UpdateUserProfileInput`. */
export interface UpdateUserProfileV1 {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  location?: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
  } | null;
  gender?: Gender | null;
  birthDate?: Date | null;
  phoneNumber?: string | null;
  stripeCustomerId?: string | null;
}
