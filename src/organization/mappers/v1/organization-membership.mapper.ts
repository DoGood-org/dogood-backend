import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  JoinRequestByIdResponseV1,
  OrganizationInviteDetailsRowV1,
  OrganizationInviteDetailsV1,
  OrganizationJoinRequestDetailsRowV1,
  OrganizationJoinRequestDetailsV1,
  OrganizationJoinRequestListItemV1,
  OrganizationJoinRequestListRowV1,
  OrganizationResponseWithoutDataV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';

@Injectable()
export class OrganizationMembershipMapperV1 {
  constructor(private readonly organizationMapper: OrganizationMapperV1) {}

  toResponseWithoutData(
    code: SuccessCode,
    message: string,
  ): OrganizationResponseWithoutDataV1 {
    return { status: 'success', code, message };
  }

  // NOTE: legacy answers this route without `code`/`message` — kept as the contract.
  toJoinRequestByIdResponse(
    joinRequest: OrganizationJoinRequestDetailsV1 | OrganizationInviteDetailsV1,
  ): JoinRequestByIdResponseV1 {
    return { status: 'success', data: { joinRequest } };
  }

  toJoinRequestListItem(
    row: OrganizationJoinRequestListRowV1,
  ): OrganizationJoinRequestListItemV1 {
    const { sender, ...joinRequest } = row;

    return {
      ...joinRequest,
      sender: { id: sender.id, profile: sender.userProfile },
    };
  }

  toJoinRequestDetails(
    row: OrganizationJoinRequestDetailsRowV1,
  ): OrganizationJoinRequestDetailsV1 {
    const { sender, receiverOrganization, ...joinRequest } = row;

    return {
      ...joinRequest,
      sender: this.organizationMapper.toOrganizationUser(sender),
      receiverOrganization:
        this.organizationMapper.toOrganization(receiverOrganization),
    };
  }

  toInviteDetails(
    row: OrganizationInviteDetailsRowV1,
  ): OrganizationInviteDetailsV1 {
    const { senderOrganization, ...invite } = row;

    return {
      ...invite,
      senderOrganization:
        this.organizationMapper.toOrganization(senderOrganization),
    };
  }
}
