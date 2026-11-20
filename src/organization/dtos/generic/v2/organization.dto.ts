import {
  CategoryType,
  JoinRequestStatus,
  OrganizationRole,
  TaskStatus,
} from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { OrganizationV2 } from 'src/organization/interfaces/organization';

export const organizationSchemaV2 = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  additionalInfo: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  location: z
    .object({ country: z.string(), region: z.string(), city: z.string() })
    .nullable(),
  hostId: z.string().nullable(),
});

export const organizationSummarySchemaV2 = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export const organizationMemberSchemaV2 = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  role: z.enum(OrganizationRole),
});

export const organizationTaskSchemaV2 = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(TaskStatus),
  categories: z.array(z.enum(CategoryType)),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const organizationJoinRequestDetailsSchemaV2 = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.enum(JoinRequestStatus),
  createdAt: z.iso.datetime(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable(),
  }),
});

export const membershipRequestStatusSchemaV2 = z.object({
  id: z.string(),
  status: z.enum(JoinRequestStatus),
});

export const organizationMembershipRequestSchemaV2 = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  status: z.enum(JoinRequestStatus),
  createdAt: z.iso.datetime(),
});

export class OrganizationDtoV2
  extends createZodDto(organizationSchemaV2)
  implements JsonSerialized<OrganizationV2> {}
