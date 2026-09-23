import { JoinRequestStatus } from '@prisma/client';
import { OrganizationMembershipMapperV2 } from 'src/organization/mappers/v2/organization-membership.mapper';

describe('OrganizationMembershipMapperV2', () => {
  const mapper = new OrganizationMembershipMapperV2();
  const createdAt = new Date('2026-09-01T10:00:00Z');

  describe('toOrganizationJoinRequestDetails', () => {
    it('should flatten the sender and default a missing avatar to null', () => {
      expect(
        mapper.toOrganizationJoinRequestDetails({
          id: 'request-id',
          receiverOrganizationId: 'organization-id',
          status: JoinRequestStatus.PENDING,
          createdAt,
          sender: { id: 'user-id', name: 'Ann', userProfile: null },
        }),
      ).toEqual({
        id: 'request-id',
        organizationId: 'organization-id',
        status: JoinRequestStatus.PENDING,
        createdAt,
        sender: { id: 'user-id', name: 'Ann', avatar: null },
      });
    });
  });

  describe('toOrganizationInvite', () => {
    it('should rename the schema keys to organizationId and userId', () => {
      expect(
        mapper.toOrganizationInvite({
          id: 'invite-id',
          senderOrganizationId: 'organization-id',
          receiverUserId: 'user-id',
          status: JoinRequestStatus.PENDING,
          createdAt,
        }),
      ).toEqual({
        id: 'invite-id',
        organizationId: 'organization-id',
        userId: 'user-id',
        status: JoinRequestStatus.PENDING,
        createdAt,
      });
    });
  });
});
