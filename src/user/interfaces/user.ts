import {
  BlockType,
  CategoryType,
  Gender,
  MembershipStatus,
  OrganizationRole,
  ReviewAuthorType,
  ReviewStatus,
  SiteRole,
  TaskStatus,
  UserStatus,
} from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

export enum UserReviewTargetTypeV1 {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  TASK = 'TASK',
  PLATFORM = 'PLATFORM',
}

// ---------- request data ----------

export interface UserLocationDataV1 {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export interface UpdateUserProfileDataV1 {
  name?: string;
  bio?: string | null;
  avatar?: string | null;
  location?: UserLocationDataV1 | null;
  gender?: Gender | null;
  birthDate?: Date | null;
  phoneNumber?: string | null;
  stripeCustomerId?: string | null;
}

export interface UpdateUserSettingsDataV1 {
  theme?: string;
  language?: string;
}

export interface SearchUsersByNameDataV1 {
  name?: string;
}

// ---------- prisma rows ----------

export interface UserProfileRowV1 {
  id: string;
  userId: string;
  bio: string | null;
  avatar: string | null;
  gender: Gender | null;
  birthDate: Date | null;
  phoneNumber: string | null;
}

export interface UserSettingsRowV1 {
  id: string;
  userId: string;
  theme: string;
  language: string;
}

export interface UserLocationRowV1 {
  location: {
    id: string;
    country: string;
    region: string;
    city: string;
  };
}

export interface UserTaskRowV1 {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  hostId: string;
  startDate: Date;
  endDate: Date | null;
  status: TaskStatus;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  createdAt: Date;
  updatedAt: Date;
  taskLocation: {
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export interface UserReviewBaseRowV1 {
  id: string;
  rating: number;
  comment: string | null;
  authorType: ReviewAuthorType;
  authorUserId: string | null;
  authorOrganizationId: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTargetReviewRowV1 extends UserReviewBaseRowV1 {
  targetUserId: string;
}

export interface OrganizationTargetReviewRowV1 extends UserReviewBaseRowV1 {
  targetOrganizationId: string;
}

export interface TaskTargetReviewRowV1 extends UserReviewBaseRowV1 {
  taskId: string;
}

export interface ReceivedReviewRowV1 extends UserTargetReviewRowV1 {
  authorUser: {
    name: string;
    userProfile: { avatar: string | null } | null;
  } | null;
}

export interface UserMembershipRowV1 {
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: Date;
  organization: {
    id: string;
    name: string;
    avatarUrl: string | null;
    description: string | null;
    createdAt: Date;
    _count: { members: number };
  };
}

export interface FullUserRowV1 {
  id: string;
  email: string;
  name: string;
  role: SiteRole;
  isEmailVerified: boolean;
  status: UserStatus;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  ban: {
    banType: BlockType;
    banReason: string | null;
    banExpiresAt: Date | null;
    bannedById: string | null;
  } | null;
  userSettings: UserSettingsRowV1 | null;
  userProfile: UserProfileRowV1 | null;
  userLocation: UserLocationRowV1 | null;
  taskParticipations: { task: UserTaskRowV1 }[];
  hostProfile: { tasks: UserTaskRowV1[] } | null;
  userReviewsWritten: UserTargetReviewRowV1[];
  orgReviewsWritten: OrganizationTargetReviewRowV1[];
  taskReviewsWritten: TaskTargetReviewRowV1[];
  systemReviewsWritten: UserReviewBaseRowV1[];
  reviewsReceived: UserTargetReviewRowV1[];
  organizations: UserMembershipRowV1[];
}

export interface PublicUserRowV1 {
  id: string;
  name: string;
  createdAt: Date;
  userProfile: UserProfileRowV1 | null;
  userLocation: UserLocationRowV1 | null;
  taskParticipations: { task: UserTaskRowV1 }[];
  hostProfile: { tasks: UserTaskRowV1[] } | null;
  reviewsReceived: ReceivedReviewRowV1[];
  organizations: UserMembershipRowV1[];
}

export interface UserNameRowV1 {
  id: string;
  name: string;
  userProfile: { avatar: string | null } | null;
}

// ---------- legacy response shapes ----------

export interface UserProfileV1 {
  id: string;
  userId: string;
  bio: string | null;
  avatar: string | null;
  gender: Gender | null;
  birthDate: Date | null;
  phoneNumber: string | null;
}

export interface UserSettingsV1 {
  id: string;
  userId: string;
  theme: string;
  language: string;
}

export interface UserLocationV1 {
  id: string;
  country: string;
  region: string;
  city: string;
}

export interface UserTaskV1 {
  id: string;
  title: string;
  description: string;
  picture: string | null;
  hostId: string;
  startDate: Date;
  endDate: Date | null;
  location: { lat: number; lng: number } | null;
  locationName: string | null;
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  status: TaskStatus;
  categories: CategoryType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReviewV1 {
  id: string;
  rating: number;
  comment: string | null;
  authorType: ReviewAuthorType;
  authorUserId: string | null;
  authorOrganizationId: string | null;
  targetType: UserReviewTargetTypeV1;
  targetUserId: string | null;
  targetOrganizationId: string | null;
  platformId: string | null;
  taskId: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserReviewV1 extends UserReviewV1 {
  authorUser: {
    name: string;
    profile: { avatar: string | null } | null;
  } | null;
}

export interface FullUserOrganizationV1 {
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

export interface FullUserV1 {
  id: string;
  email: string;
  name: string;
  siteRole: SiteRole;
  isEmailVerified: boolean;
  status: UserStatus;
  banType: BlockType | null;
  banReason: string | null;
  banExpiresAt: Date | null;
  bannedById: string | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  userSettings: UserSettingsV1 | null;
  profile: UserProfileV1 | null;
  location: UserLocationV1 | null;
  joinedTasks: UserTaskV1[];
  reviewsWrittenUser: UserReviewV1[];
  reviewsReceived: UserReviewV1[];
  organizations: FullUserOrganizationV1[];
  tasks: UserTaskV1[];
}

export interface PublicUserV1 {
  id: string;
  name: string;
  createdAt: Date;
  profile: UserProfileV1 | null;
  location: UserLocationV1 | null;
  joinedTasks: UserTaskV1[];
  reviewsReceived: PublicUserReviewV1[];
  organizations: PublicUserOrganizationV1[];
  tasks: UserTaskV1[];
}

export interface UserNameV1 {
  id: string;
  name: string;
  avatar: string | null;
}

export interface UserResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  data: T;
}

export interface UserMessageResponseV1<T> extends UserResponseV1<T> {
  message: string;
}

export interface UserDeletedResponseV1 {
  status: 'success';
  code: SuccessCode;
}
