import {
  CategoryType,
  MembershipStatus,
  OrganizationRole,
  Prisma,
  ReviewAuthorType,
  ReviewStatus,
  TaskStatus,
} from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

// v1 — requests

export interface OrganizationLocationDataV1 {
  country?: string;
  region?: string;
  city?: string;
}

export interface CreateOrganizationDataV1 {
  name: string;
  avatar?: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  moreInfo?: string;
  location?: OrganizationLocationDataV1;
}

export interface UpdateOrganizationDataV1 {
  name?: string;
  avatar?: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  moreInfo?: string;
  location?: OrganizationLocationDataV1;
}

// v1 — database rows

export interface OrganizationRowV1 {
  id: string;
  name: string;
  createdAt: Date;
  phoneNumber: string | null;
  email: string | null;
  description: string | null;
  additionalInfo: string | null;
  avatarUrl: string | null;
  locationId: string | null;
}

export interface OrganizationLocationRowV1 {
  id: string;
  country: string;
  region: string;
  city: string;
}

export interface OrganizationMembershipV1 {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: Date;
}

export interface OrganizationUserRowV1 {
  id: string;
  name: string;
  userProfile: { avatar: string | null } | null;
}

export interface OrganizationMemberRowV1 {
  id: string;
  role: OrganizationRole;
  status: MembershipStatus;
  userId: string;
  organizationId: string;
  user: OrganizationUserRowV1;
}

export interface OrganizationReviewBaseV1 {
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

export interface OrganizationTaskReviewV1 extends OrganizationReviewBaseV1 {
  taskId: string;
}

export interface OrganizationTaskRowV1 {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  status: TaskStatus;
  hostId: string;
  startDate: Date;
  endDate: Date | null;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  createdAt: Date;
  updatedAt: Date;
  taskLocation: { name: string | null } | null;
}

export interface OrganizationHostedTaskRowV1 extends OrganizationTaskRowV1 {
  reviews: OrganizationTaskReviewV1[];
}

export interface OrganizationReceivedReviewRowV1 extends OrganizationReviewBaseV1 {
  targetOrganizationId: string;
  authorUser: OrganizationUserRowV1 | null;
  authorOrganization: OrganizationRowV1 | null;
}

export interface OrganizationWrittenUserReviewRowV1 extends OrganizationReviewBaseV1 {
  targetUserId: string;
  targetUser: OrganizationUserRowV1;
}

export interface OrganizationWrittenOrganizationReviewRowV1 extends OrganizationReviewBaseV1 {
  targetOrganizationId: string;
  targetOrganization: OrganizationRowV1;
}

export interface OrganizationWrittenTaskReviewRowV1 extends OrganizationReviewBaseV1 {
  taskId: string;
  task: OrganizationTaskRowV1;
}

export interface OrganizationDetailsRowV1 extends OrganizationRowV1 {
  location: OrganizationLocationRowV1 | null;
  hostProfile: { id: string; tasks: OrganizationHostedTaskRowV1[] } | null;
  members: OrganizationMemberRowV1[];
  reviewsReceived: OrganizationReceivedReviewRowV1[];
  userReviewsWritten: OrganizationWrittenUserReviewRowV1[];
  orgReviewsWritten: OrganizationWrittenOrganizationReviewRowV1[];
  taskReviewsWritten: OrganizationWrittenTaskReviewRowV1[];
  systemReviewsWritten: OrganizationReviewBaseV1[];
}

export interface OrganizationCreatedRowV1 extends OrganizationRowV1 {
  location: OrganizationLocationRowV1 | null;
  members: OrganizationMembershipV1[];
}

export interface OrganizationUpdatedRowV1 extends OrganizationRowV1 {
  location: OrganizationLocationRowV1 | null;
}

export interface OrganizationSummaryRowV1 {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// v1 — responses

export interface OrganizationV1 {
  id: string;
  name: string;
  createdAt: Date;
  phoneNumber: string | null;
  email: string | null;
  description: string | null;
  moreInfo: string | null;
  avatar: string | null;
  locationId: string | null;
}

export interface OrganizationLocationV1 {
  id: string;
  country: string | null;
  region: string | null;
  city: string | null;
}

export interface OrganizationUserV1 {
  id: string;
  name: string;
  profile: { avatar: string | null } | null;
}

export interface OrganizationMemberV1 {
  id: string;
  role: OrganizationRole;
  status: MembershipStatus;
  userId: string;
  organizationId: string;
  user: OrganizationUserV1;
}

export interface OrganizationTaskV1 {
  id: string;
  title: string;
  description: string;
  picture: string | null;
  status: TaskStatus;
  hostId: string;
  startDate: Date;
  endDate: Date | null;
  locationName: string | null;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationHostedTaskV1 extends OrganizationTaskV1 {
  reviews: OrganizationTaskReviewV1[];
}

export interface OrganizationReceivedReviewV1 extends OrganizationReviewBaseV1 {
  targetOrganizationId: string;
  authorUser: OrganizationUserV1 | null;
  authorOrganization: OrganizationV1 | null;
}

// NOTE: the legacy single Review table is split into four in the current schema; every written review
// carries all three legacy target keys, null where its table has no such target.
export interface OrganizationWrittenReviewV1 extends OrganizationReviewBaseV1 {
  targetUserId: string | null;
  targetOrganizationId: string | null;
  taskId: string | null;
  targetUser: OrganizationUserV1 | null;
  targetOrganization: OrganizationV1 | null;
  task: OrganizationTaskV1 | null;
}

export interface OrganizationDetailsV1 extends OrganizationV1 {
  location: OrganizationLocationV1 | null;
  members: OrganizationMemberV1[];
  reviews: OrganizationReceivedReviewV1[];
  reviewsWrittenOrg: OrganizationWrittenReviewV1[];
  hostId?: string;
  tasks: OrganizationHostedTaskV1[];
}

export interface OrganizationCreatedV1 extends OrganizationV1 {
  location: OrganizationLocationV1 | null;
  members: OrganizationMembershipV1[];
}

export interface OrganizationUpdatedV1 extends OrganizationV1 {
  location: OrganizationLocationV1 | null;
}

export interface OrganizationSummaryV1 {
  id: string;
  name: string;
  avatar: string | null;
}

export interface OrganizationResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  message: string;
  data: T;
}

// v2 — requests

export enum OrganizationSortFieldV2 {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export interface OrganizationsParamsV2 {
  search?: string;
  sort?: OrganizationSortFieldV2;
  sortDirection?: Prisma.SortOrder;
  skip?: number;
  limit?: number;
}

export interface OrganizationPageParamsV2 {
  skip?: number;
  limit?: number;
}

export interface OrganizationLocationDataV2 {
  country?: string;
  region?: string;
  city?: string;
}

export interface CreateOrganizationDataV2 {
  name: string;
  avatarUrl?: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  additionalInfo?: string;
  location?: OrganizationLocationDataV2;
}

export interface UpdateOrganizationDataV2 {
  name?: string;
  avatarUrl?: string;
  description?: string;
  phoneNumber?: string;
  email?: string;
  additionalInfo?: string;
  location?: OrganizationLocationDataV2;
}

// v2 — database rows and responses

export interface OrganizationLocationV2 {
  country: string;
  region: string;
  city: string;
}

export interface OrganizationRowV2 {
  id: string;
  name: string;
  description: string | null;
  phoneNumber: string | null;
  email: string | null;
  additionalInfo: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  location: OrganizationLocationV2 | null;
  hostProfile: { id: string } | null;
}

export interface OrganizationV2 {
  id: string;
  name: string;
  description: string | null;
  phoneNumber: string | null;
  email: string | null;
  additionalInfo: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  location: OrganizationLocationV2 | null;
  hostId: string | null;
}

export interface OrganizationSummaryV2 {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface OrganizationMemberRowV2 {
  role: OrganizationRole;
  user: {
    id: string;
    name: string;
    userProfile: { avatar: string | null } | null;
  };
}

export interface OrganizationMemberV2 {
  userId: string;
  name: string;
  avatar: string | null;
  role: OrganizationRole;
}

export interface OrganizationTaskV2 {
  id: string;
  title: string;
  imageUrl: string | null;
  status: TaskStatus;
  categories: CategoryType[];
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
}
