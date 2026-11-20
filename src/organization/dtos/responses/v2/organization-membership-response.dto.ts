import { JoinRequestStatus, OrganizationRole } from '@prisma/client';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  membershipRequestStatusSchemaV2,
  organizationJoinRequestDetailsSchemaV2,
  organizationMembershipRequestSchemaV2,
  organizationSummarySchemaV2,
} from 'src/organization/dtos/generic/v2/organization.dto';
import {
  MembershipRequestStatusV2,
  OrganizationInviteDetailsV2,
  OrganizationInviteV2,
  OrganizationJoinRequestDetailsV2,
  OrganizationJoinRequestV2,
  OrganizationMemberRoleV2,
} from 'src/organization/interfaces/organization';

const organizationJoinRequestResponseSchemaV2 = z.object({
  data: organizationJoinRequestDetailsSchemaV2,
});

const getOrganizationJoinRequestsResponseSchemaV2 = z.object({
  data: z.array(organizationJoinRequestDetailsSchemaV2),
});

const organizationInviteDetailsResponseSchemaV2 = z.object({
  data: z.object({
    id: z.string(),
    userId: z.string(),
    status: z.enum(JoinRequestStatus),
    createdAt: z.iso.datetime(),
    organization: organizationSummarySchemaV2,
  }),
});

const membershipRequestStatusResponseSchemaV2 = z.object({
  data: membershipRequestStatusSchemaV2,
});

// NOTE: an invite and a created join request share one shape — `{ id, organizationId, userId, status, createdAt }`.
const organizationMembershipRequestResponseSchemaV2 = z.object({
  data: organizationMembershipRequestSchemaV2,
});

const organizationMemberRoleResponseSchemaV2 = z.object({
  data: z.object({
    userId: z.string(),
    organizationId: z.string(),
    role: z.enum(OrganizationRole),
  }),
});

export class OrganizationJoinRequestResponseDtoV2
  extends createZodDto(organizationJoinRequestResponseSchemaV2)
  implements
    JsonSerialized<ResponseWrapper<OrganizationJoinRequestDetailsV2>> {}

export class GetOrganizationJoinRequestsResponseDtoV2
  extends createZodDto(getOrganizationJoinRequestsResponseSchemaV2)
  implements
    JsonSerialized<ResponseWrapper<OrganizationJoinRequestDetailsV2[]>> {}

export class OrganizationInviteDetailsResponseDtoV2
  extends createZodDto(organizationInviteDetailsResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationInviteDetailsV2>> {}

export class MembershipRequestStatusResponseDtoV2
  extends createZodDto(membershipRequestStatusResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<MembershipRequestStatusV2>> {}

export class OrganizationMembershipRequestResponseDtoV2
  extends createZodDto(organizationMembershipRequestResponseSchemaV2)
  implements
    JsonSerialized<ResponseWrapper<OrganizationInviteV2>>,
    JsonSerialized<ResponseWrapper<OrganizationJoinRequestV2>> {}

export class OrganizationMemberRoleResponseDtoV2
  extends createZodDto(organizationMemberRoleResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationMemberRoleV2>> {}
