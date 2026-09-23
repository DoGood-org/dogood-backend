import { OrganizationRole } from '@prisma/client';
import { OrganizationMapperV2 } from 'src/organization/mappers/v2/organization.mapper';

describe('OrganizationMapperV2', () => {
  const mapper = new OrganizationMapperV2();
  const row = {
    id: 'organization-id',
    name: 'Helpers',
    description: null,
    phoneNumber: null,
    email: null,
    additionalInfo: null,
    avatarUrl: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    location: null,
  };

  describe('toOrganization', () => {
    it('should flatten the host profile into hostId', () => {
      expect(
        mapper.toOrganization({ ...row, hostProfile: { id: 'host-id' } }),
      ).toEqual({ ...row, hostId: 'host-id' });
    });

    it('should answer null hostId for an organization that never hosted', () => {
      expect(mapper.toOrganization({ ...row, hostProfile: null }).hostId).toBe(
        null,
      );
    });
  });

  describe('toOrganizationMember', () => {
    it('should flatten the member user and profile', () => {
      expect(
        mapper.toOrganizationMember({
          role: OrganizationRole.MODERATOR,
          user: { id: 'user-id', name: 'Ann', userProfile: null },
        }),
      ).toEqual({
        userId: 'user-id',
        name: 'Ann',
        avatar: null,
        role: OrganizationRole.MODERATOR,
      });
    });
  });
});
