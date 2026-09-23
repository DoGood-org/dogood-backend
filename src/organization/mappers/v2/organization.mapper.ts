import { Injectable } from '@nestjs/common';
import {
  OrganizationMemberRowV2,
  OrganizationMemberV2,
  OrganizationRowV2,
  OrganizationV2,
} from 'src/organization/interfaces/organization';

@Injectable()
export class OrganizationMapperV2 {
  toOrganization(row: OrganizationRowV2): OrganizationV2 {
    const { hostProfile, ...organization } = row;

    return { ...organization, hostId: hostProfile?.id ?? null };
  }

  toOrganizationMember(row: OrganizationMemberRowV2): OrganizationMemberV2 {
    const { role, user } = row;

    return {
      userId: user.id,
      name: user.name,
      avatar: user.userProfile?.avatar ?? null,
      role,
    };
  }
}
