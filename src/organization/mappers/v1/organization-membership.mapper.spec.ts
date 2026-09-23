import { JoinRequestStatus } from '@prisma/client';
import { OrganizationMembershipMapperV1 } from 'src/organization/mappers/v1/organization-membership.mapper';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';

describe('OrganizationMembershipMapperV1', () => {
  const mapper = new OrganizationMembershipMapperV1(new OrganizationMapperV1());
  const createdAt = new Date('2026-09-01T10:00:00Z');

  describe('toJoinRequestDetails', () => {
    it('should expose the sender profile and the organization under legacy keys', () => {
      const details = mapper.toJoinRequestDetails({
        id: 'request-id',
        senderId: 'user-id',
        receiverOrganizationId: 'organization-id',
        status: JoinRequestStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
        sender: {
          id: 'user-id',
          name: 'Ann',
          userProfile: { avatar: 'https://a.test/ann.png' },
        },
        receiverOrganization: {
          id: 'organization-id',
          name: 'Helpers',
          createdAt,
          phoneNumber: null,
          email: null,
          description: null,
          additionalInfo: 'More',
          avatarUrl: 'https://a.test/org.png',
          locationId: null,
        },
      });

      expect(details.sender).toEqual({
        id: 'user-id',
        name: 'Ann',
        profile: { avatar: 'https://a.test/ann.png' },
      });
      expect(details.receiverOrganization).toMatchObject({
        moreInfo: 'More',
        avatar: 'https://a.test/org.png',
      });
    });
  });

  describe('toJoinRequestListItem', () => {
    it('should rename userProfile to profile and keep only the sender id', () => {
      const item = mapper.toJoinRequestListItem({
        id: 'request-id',
        senderId: 'user-id',
        receiverOrganizationId: 'organization-id',
        status: JoinRequestStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
        sender: { id: 'user-id', userProfile: null },
      });

      expect(item.sender).toEqual({ id: 'user-id', profile: null });
    });
  });
});
