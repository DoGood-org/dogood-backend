import { ResponseWrapper } from '@shared/response/response.wrapper';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  organizationMemberSchemaV2,
  organizationSchemaV2,
  organizationSummarySchemaV2,
  organizationTaskSchemaV2,
} from 'src/organization/dtos/generic/v2/organization.dto';
import {
  OrganizationMemberV2,
  OrganizationSummaryV2,
  OrganizationTaskV2,
  OrganizationV2,
} from 'src/organization/interfaces/organization';

const organizationResponseSchemaV2 = z.object({ data: organizationSchemaV2 });

const getOrganizationsResponseSchemaV2 = z.object({
  data: z.array(organizationSummarySchemaV2),
});

const getOrganizationMembersResponseSchemaV2 = z.object({
  data: z.array(organizationMemberSchemaV2),
});

const getOrganizationTasksResponseSchemaV2 = z.object({
  data: z.array(organizationTaskSchemaV2),
});

export class OrganizationResponseDtoV2
  extends createZodDto(organizationResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationV2>> {}

export class GetOrganizationsResponseDtoV2
  extends createZodDto(getOrganizationsResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationSummaryV2[]>> {}

export class GetOrganizationMembersResponseDtoV2
  extends createZodDto(getOrganizationMembersResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationMemberV2[]>> {}

export class GetOrganizationTasksResponseDtoV2
  extends createZodDto(getOrganizationTasksResponseSchemaV2)
  implements JsonSerialized<ResponseWrapper<OrganizationTaskV2[]>> {}
