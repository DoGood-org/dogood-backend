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
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  FullUserV1,
  PublicUserV1,
  UserProfileV1,
  UserReviewTargetTypeV1,
} from 'src/user/interfaces/user';

export const userProfileSchemaV1 = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  gender: z.enum(Gender).nullable(),
  birthDate: z.iso.datetime().nullable(),
  phoneNumber: z.string().nullable(),
});

const userLocationSchemaV1 = z.object({
  id: z.string(),
  country: z.string(),
  region: z.string(),
  city: z.string(),
});

const userTaskSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  picture: z.string().nullable(),
  hostId: z.string(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  locationName: z.string().nullable(),
  amount: z.number().nullable(),
  currentAmount: z.number().nullable(),
  currency: z.string().nullable(),
  requirements: z.string().nullable(),
  status: z.enum(TaskStatus),
  categories: z.array(z.enum(CategoryType)),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const userReviewSchemaV1 = z.object({
  id: z.string(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  authorType: z.enum(ReviewAuthorType),
  authorUserId: z.string().nullable(),
  authorOrganizationId: z.string().nullable(),
  targetType: z.enum(UserReviewTargetTypeV1),
  targetUserId: z.string().nullable(),
  targetOrganizationId: z.string().nullable(),
  platformId: z.string().nullable(),
  taskId: z.string().nullable(),
  status: z.enum(ReviewStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserSchemaV1 = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  siteRole: z.enum(SiteRole),
  isEmailVerified: z.boolean(),
  status: z.enum(UserStatus),
  banType: z.enum(BlockType).nullable(),
  banReason: z.string().nullable(),
  banExpiresAt: z.iso.datetime().nullable(),
  bannedById: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  userSettings: z
    .object({
      id: z.string(),
      userId: z.string(),
      theme: z.string(),
      language: z.string(),
    })
    .nullable(),
  profile: userProfileSchemaV1.nullable(),
  location: userLocationSchemaV1.nullable(),
  joinedTasks: z.array(userTaskSchemaV1),
  reviewsWrittenUser: z.array(userReviewSchemaV1),
  reviewsReceived: z.array(userReviewSchemaV1),
  organizations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().nullable(),
      description: z.string().nullable(),
      createdAt: z.iso.datetime(),
      _count: z.object({ members: z.number().int() }),
      role: z.enum(OrganizationRole),
      status: z.enum(MembershipStatus),
      joinedAt: z.iso.datetime(),
    }),
  ),
  tasks: z.array(userTaskSchemaV1),
});

export const publicUserSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  profile: userProfileSchemaV1.nullable(),
  location: userLocationSchemaV1.nullable(),
  joinedTasks: z.array(userTaskSchemaV1),
  reviewsReceived: z.array(
    userReviewSchemaV1.extend({
      authorUser: z
        .object({
          name: z.string(),
          profile: z.object({ avatar: z.string().nullable() }).nullable(),
        })
        .nullable(),
    }),
  ),
  organizations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().nullable(),
      description: z.string().nullable(),
      role: z.enum(OrganizationRole),
      status: z.enum(MembershipStatus),
      joinedAt: z.iso.datetime(),
      membersCount: z.number().int(),
    }),
  ),
  tasks: z.array(userTaskSchemaV1),
});

export class UserProfileDtoV1
  extends createZodDto(userProfileSchemaV1)
  implements JsonSerialized<UserProfileV1> {}

export class FullUserDtoV1
  extends createZodDto(fullUserSchemaV1)
  implements JsonSerialized<FullUserV1> {}

export class PublicUserDtoV1
  extends createZodDto(publicUserSchemaV1)
  implements JsonSerialized<PublicUserV1> {}
