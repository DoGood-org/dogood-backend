import {
  CategoryType,
  Gender,
  JoinRequestStatus,
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
  AdminOrganizationV1,
  OrganizationDetailsV1,
  OrganizationV1,
} from 'src/organization/interfaces/organization';

export const organizationSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  description: z.string().nullable(),
  moreInfo: z.string().nullable(),
  avatar: z.string().nullable(),
  locationId: z.string().nullable(),
});

export const organizationLocationSchemaV1 = z.object({
  id: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
});

export const organizationUserSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  profile: z.object({ avatar: z.string().nullable() }).nullable(),
});

export const organizationMembershipSchemaV1 = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: z.enum(OrganizationRole),
  status: z.enum(MembershipStatus),
  createdAt: z.iso.datetime(),
});

export const organizationMemberSchemaV1 = z.object({
  id: z.string(),
  role: z.enum(OrganizationRole),
  status: z.enum(MembershipStatus),
  userId: z.string(),
  organizationId: z.string(),
  user: organizationUserSchemaV1,
});

export const organizationSummarySchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

const organizationReviewBaseSchemaV1 = z.object({
  id: z.string(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  authorType: z.enum(ReviewAuthorType),
  authorUserId: z.string().nullable(),
  authorOrganizationId: z.string().nullable(),
  status: z.enum(ReviewStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const organizationTaskSchemaV1 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  picture: z.string().nullable(),
  status: z.enum(TaskStatus),
  hostId: z.string(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  locationName: z.string().nullable(),
  categories: z.array(z.enum(CategoryType)),
  amount: z.number().nullable(),
  currentAmount: z.number().nullable(),
  currency: z.string().nullable(),
  requirements: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const organizationDetailsSchemaV1 = organizationSchemaV1.extend({
  location: organizationLocationSchemaV1.nullable(),
  members: z.array(organizationMemberSchemaV1),
  reviews: z.array(
    organizationReviewBaseSchemaV1.extend({
      targetOrganizationId: z.string(),
      authorUser: organizationUserSchemaV1.nullable(),
      authorOrganization: organizationSchemaV1.nullable(),
    }),
  ),
  reviewsWrittenOrg: z.array(
    organizationReviewBaseSchemaV1.extend({
      targetUserId: z.string().nullable(),
      targetOrganizationId: z.string().nullable(),
      taskId: z.string().nullable(),
      targetUser: organizationUserSchemaV1.nullable(),
      targetOrganization: organizationSchemaV1.nullable(),
      task: organizationTaskSchemaV1.nullable(),
    }),
  ),
  hostId: z.string().optional(),
  tasks: z.array(
    organizationTaskSchemaV1.extend({
      reviews: z.array(
        organizationReviewBaseSchemaV1.extend({ taskId: z.string() }),
      ),
    }),
  ),
});

export const organizationJoinRequestSchemaV1 = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverOrganizationId: z.string(),
  status: z.enum(JoinRequestStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const organizationInviteSchemaV1 = z.object({
  id: z.string(),
  senderOrganizationId: z.string(),
  receiverUserId: z.string(),
  status: z.enum(JoinRequestStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const organizationApplicantProfileSchemaV1 = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  gender: z.enum(Gender).nullable(),
  birthDate: z.iso.datetime().nullable(),
  phoneNumber: z.string().nullable(),
});

export const adminOrganizationSchemaV1 = organizationSchemaV1.extend({
  stripeCustomerId: z.string().nullable(),
  location: organizationLocationSchemaV1.nullable(),
  members: z.array(
    organizationMembershipSchemaV1.extend({
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        status: z.enum(UserStatus),
        siteRole: z.enum(SiteRole),
        profile: z.object({ avatar: z.string().nullable() }).nullable(),
      }),
    }),
  ),
});

export class OrganizationDtoV1
  extends createZodDto(organizationSchemaV1)
  implements JsonSerialized<OrganizationV1> {}

export class OrganizationDetailsDtoV1
  extends createZodDto(organizationDetailsSchemaV1)
  implements JsonSerialized<OrganizationDetailsV1> {}

export class AdminOrganizationDtoV1
  extends createZodDto(adminOrganizationSchemaV1)
  implements JsonSerialized<AdminOrganizationV1> {}
