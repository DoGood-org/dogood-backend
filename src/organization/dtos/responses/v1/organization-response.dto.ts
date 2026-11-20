import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  organizationDetailsSchemaV1,
  organizationLocationSchemaV1,
  organizationMemberSchemaV1,
  organizationMembershipSchemaV1,
  organizationSchemaV1,
  organizationSummarySchemaV1,
} from 'src/organization/dtos/generic/v1/organization.dto';
import {
  OrganizationCreatedV1,
  OrganizationDetailsV1,
  OrganizationMemberV1,
  OrganizationResponseV1,
  OrganizationSummaryV1,
  OrganizationUpdatedV1,
} from 'src/organization/interfaces/organization';

const createOrganizationResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_CREATED),
  message: z.string(),
  data: z.object({
    organization: organizationSchemaV1.extend({
      location: organizationLocationSchemaV1.nullable(),
      members: z.array(organizationMembershipSchemaV1),
    }),
  }),
});

const getOrganizationsByNameResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_DATA_RETRIEVED),
  message: z.string(),
  data: z.array(organizationSummarySchemaV1),
});

const getOrganizationResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_DATA_RETRIEVED),
  message: z.string(),
  data: z.object({ organization: organizationDetailsSchemaV1 }),
});

const updateOrganizationResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_UPDATED),
  message: z.string(),
  data: z.object({
    organization: organizationSchemaV1.extend({
      location: organizationLocationSchemaV1.nullable(),
    }),
  }),
});

const deleteOrganizationResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_DELETED),
  message: z.string(),
  data: z.object({ result: z.object({ message: z.string() }) }),
});

const getOrganizationMembersResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.ORGANIZATION_MEMBERS_RETRIEVED),
  message: z.string(),
  data: z.object({ members: z.array(organizationMemberSchemaV1) }),
});

export class CreateOrganizationResponseDtoV1
  extends createZodDto(createOrganizationResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ organization: OrganizationCreatedV1 }>
    > {}

export class GetOrganizationsByNameResponseDtoV1
  extends createZodDto(getOrganizationsByNameResponseSchemaV1)
  implements JsonSerialized<OrganizationResponseV1<OrganizationSummaryV1[]>> {}

export class GetOrganizationResponseDtoV1
  extends createZodDto(getOrganizationResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ organization: OrganizationDetailsV1 }>
    > {}

export class UpdateOrganizationResponseDtoV1
  extends createZodDto(updateOrganizationResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ organization: OrganizationUpdatedV1 }>
    > {}

export class DeleteOrganizationResponseDtoV1
  extends createZodDto(deleteOrganizationResponseSchemaV1)
  implements
    JsonSerialized<OrganizationResponseV1<{ result: { message: string } }>> {}

export class GetOrganizationMembersResponseDtoV1
  extends createZodDto(getOrganizationMembersResponseSchemaV1)
  implements
    JsonSerialized<
      OrganizationResponseV1<{ members: OrganizationMemberV1[] }>
    > {}
