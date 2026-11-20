import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  organizationApplicantProfileSchemaV1,
  organizationInviteSchemaV1,
  organizationJoinRequestSchemaV1,
  organizationMembershipSchemaV1,
  organizationSchemaV1,
  organizationUserSchemaV1,
} from 'src/organization/dtos/generic/v1/organization.dto';
import {
  JoinRequestByIdResponseV1,
  OrganizationInviteCreatedV1,
  OrganizationInviteV1,
  OrganizationJoinRequestCreatedV1,
  OrganizationJoinRequestListItemV1,
  OrganizationJoinRequestV1,
  OrganizationMemberRoleUpdatedV1,
  OrganizationResponseV1,
  OrganizationResponseWithoutDataV1,
} from 'src/organization/interfaces/organization';

const inviteOrganizationMemberResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.JOIN_REQUEST_CREATED),
  message: z.string(),
  data: z.object({
    invite: organizationInviteSchemaV1.extend({
      senderOrganization: z.object({ name: z.string() }),
      receiverUser: z.object({ name: z.string() }),
    }),
  }),
});

const removeOrganizationMemberResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.MEMBER_REMOVED_FROM_ORGANIZATION),
  message: z.string(),
});

const updateOrganizationMemberRoleResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.MEMBER_ROLE_UPDATED),
  message: z.string(),
  data: z.object({
    result: organizationMembershipSchemaV1.extend({
      organization: z.object({ name: z.string() }),
    }),
  }),
});

const createJoinRequestResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.JOIN_REQUEST_CREATED),
  message: z.string(),
  data: z.object({
    joinRequest: organizationJoinRequestSchemaV1.extend({
      sender: z.object({ name: z.string() }),
      receiverOrganization: z.object({ name: z.string() }),
    }),
  }),
});

const updateJoinRequestStatusResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.JOIN_REQUEST_STATUS_UPDATED),
  message: z.string(),
  data: z.object({
    result: z.union([
      organizationJoinRequestSchemaV1,
      organizationInviteSchemaV1,
    ]),
  }),
});

const getJoinRequestResponseSchemaV1 = z.object({
  status: z.literal('success'),
  data: z.object({
    joinRequest: z.union([
      organizationJoinRequestSchemaV1.extend({
        sender: organizationUserSchemaV1,
        receiverOrganization: organizationSchemaV1,
      }),
      organizationInviteSchemaV1.extend({
        senderOrganization: organizationSchemaV1,
      }),
    ]),
  }),
});

const getOrganizationJoinRequestsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.JOIN_REQUESTS_RETRIEVED),
  message: z.string(),
  data: z.object({
    joinRequests: z.array(
      organizationJoinRequestSchemaV1.extend({
        sender: z.object({
          id: z.string(),
          profile: organizationApplicantProfileSchemaV1.nullable(),
        }),
      }),
    ),
  }),
});

export class InviteOrganizationMemberResponseDtoV1
  extends createZodDto(inviteOrganizationMemberResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ invite: OrganizationInviteCreatedV1 }>
    > {}

export class RemoveOrganizationMemberResponseDtoV1
  extends createZodDto(removeOrganizationMemberResponseSchemaV1)
  implements JsonSerialized<OrganizationResponseWithoutDataV1> {}

export class UpdateOrganizationMemberRoleResponseDtoV1
  extends createZodDto(updateOrganizationMemberRoleResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ result: OrganizationMemberRoleUpdatedV1 }>
    > {}

export class CreateJoinRequestResponseDtoV1
  extends createZodDto(createJoinRequestResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ joinRequest: OrganizationJoinRequestCreatedV1 }>
    > {}

export class UpdateJoinRequestStatusResponseDtoV1
  extends createZodDto(updateJoinRequestStatusResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{
        result: OrganizationJoinRequestV1 | OrganizationInviteV1;
      }>
    > {}

export class GetJoinRequestResponseDtoV1
  extends createZodDto(getJoinRequestResponseSchemaV1)
  implements JsonSerialized<JoinRequestByIdResponseV1> {}

export class GetOrganizationJoinRequestsResponseDtoV1
  extends createZodDto(getOrganizationJoinRequestsResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{
        joinRequests: OrganizationJoinRequestListItemV1[];
      }>
    > {}
