import { Injectable } from '@nestjs/common';
import {
  OrganizationInviteDetailsRowV2,
  OrganizationInviteDetailsV2,
  OrganizationInviteRowV2,
  OrganizationInviteV2,
  OrganizationJoinRequestDetailsRowV2,
  OrganizationJoinRequestDetailsV2,
  OrganizationJoinRequestRowV2,
  OrganizationJoinRequestV2,
} from 'src/organization/interfaces/organization';

@Injectable()
export class OrganizationMembershipMapperV2 {
  toOrganizationInvite(row: OrganizationInviteRowV2): OrganizationInviteV2 {
    const { id, senderOrganizationId, receiverUserId, status, createdAt } = row;

    return {
      id,
      organizationId: senderOrganizationId,
      userId: receiverUserId,
      status,
      createdAt,
    };
  }

  toOrganizationJoinRequest(
    row: OrganizationJoinRequestRowV2,
  ): OrganizationJoinRequestV2 {
    const { id, senderId, receiverOrganizationId, status, createdAt } = row;

    return {
      id,
      organizationId: receiverOrganizationId,
      userId: senderId,
      status,
      createdAt,
    };
  }

  toOrganizationJoinRequestDetails(
    row: OrganizationJoinRequestDetailsRowV2,
  ): OrganizationJoinRequestDetailsV2 {
    const { id, receiverOrganizationId, status, createdAt, sender } = row;

    return {
      id,
      organizationId: receiverOrganizationId,
      status,
      createdAt,
      sender: {
        id: sender.id,
        name: sender.name,
        avatar: sender.userProfile?.avatar ?? null,
      },
    };
  }

  toOrganizationInviteDetails(
    row: OrganizationInviteDetailsRowV2,
  ): OrganizationInviteDetailsV2 {
    const { id, receiverUserId, status, createdAt, senderOrganization } = row;

    return {
      id,
      userId: receiverUserId,
      status,
      createdAt,
      organization: senderOrganization,
    };
  }
}
