import {
  MembershipStatus,
  OrganizationRole,
  ReviewAuthorType,
  ReviewStatus,
  TaskStatus,
} from '@prisma/client';
import {
  OrganizationDetailsRowV1,
  OrganizationRowV1,
  OrganizationTaskRowV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';

describe('OrganizationMapperV1', () => {
  const mapper = new OrganizationMapperV1();
  const createdAt = new Date('2026-09-01T10:00:00Z');
  const organizationRow: OrganizationRowV1 = {
    id: 'organization-id',
    name: 'Helpers',
    createdAt,
    phoneNumber: null,
    email: 'org@example.com',
    description: null,
    additionalInfo: 'More',
    avatarUrl: 'https://example.com/a.png',
    locationId: 'location-id',
  };
  const taskRow: OrganizationTaskRowV1 = {
    id: 'task-id',
    title: 'Clean park',
    description: 'Bring gloves',
    imageUrl: 'https://example.com/t.png',
    status: TaskStatus.PENDING,
    hostId: 'host-id',
    startDate: createdAt,
    endDate: null,
    categories: [],
    amount: null,
    currentAmount: null,
    currency: null,
    requirements: null,
    createdAt,
    updatedAt: createdAt,
    taskLocation: { name: 'Park' },
  };
  const review = {
    id: 'review-id',
    rating: 5,
    comment: null,
    authorType: ReviewAuthorType.ORGANIZATION,
    authorUserId: null,
    authorOrganizationId: 'organization-id',
    status: ReviewStatus.PENDING,
    createdAt,
    updatedAt: createdAt,
  };
  const user = { id: 'user-id', name: 'Ann', userProfile: { avatar: null } };

  describe('toOrganization', () => {
    it('should rename current columns to the legacy fields and leave out stripeCustomerId', () => {
      expect(mapper.toOrganization(organizationRow)).toEqual({
        id: 'organization-id',
        name: 'Helpers',
        createdAt,
        phoneNumber: null,
        email: 'org@example.com',
        description: null,
        moreInfo: 'More',
        avatar: 'https://example.com/a.png',
        locationId: 'location-id',
      });
    });
  });

  describe('toOrganizationDetails', () => {
    const detailsRow: OrganizationDetailsRowV1 = {
      ...organizationRow,
      location: { id: 'location-id', country: 'Ukraine', region: '', city: '' },
      hostProfile: { id: 'host-id', tasks: [{ ...taskRow, reviews: [] }] },
      members: [
        {
          id: 'membership-id',
          role: OrganizationRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          userId: 'user-id',
          organizationId: 'organization-id',
          user,
        },
      ],
      reviewsReceived: [],
      userReviewsWritten: [
        {
          ...review,
          id: 'user-review',
          targetUserId: 'user-id',
          targetUser: user,
        },
      ],
      orgReviewsWritten: [],
      taskReviewsWritten: [
        { ...review, id: 'task-review', taskId: 'task-id', task: taskRow },
      ],
      systemReviewsWritten: [{ ...review, id: 'system-review' }],
    };

    it('should lift the host id and tasks to the top level', () => {
      const details = mapper.toOrganizationDetails(detailsRow);

      expect(details.hostId).toBe('host-id');
      expect(details.tasks).toEqual([
        expect.objectContaining({
          id: 'task-id',
          picture: 'https://example.com/t.png',
          locationName: 'Park',
          reviews: [],
        }),
      ]);
      expect(details).not.toHaveProperty('hostProfile');
    });

    it('should leave hostId out when the organization never hosted', () => {
      const details = mapper.toOrganizationDetails({
        ...detailsRow,
        hostProfile: null,
      });

      expect(details.hostId).toBeUndefined();
      expect(details.tasks).toEqual([]);
    });

    it('should turn empty location parts back into legacy nulls', () => {
      expect(mapper.toOrganizationDetails(detailsRow).location).toEqual({
        id: 'location-id',
        country: 'Ukraine',
        region: null,
        city: null,
      });
    });

    it('should expose the member profile under the legacy name', () => {
      expect(mapper.toOrganizationDetails(detailsRow).members[0].user).toEqual({
        id: 'user-id',
        name: 'Ann',
        profile: { avatar: null },
      });
    });

    it('should merge the four authored review tables into reviewsWrittenOrg with null-filled targets', () => {
      const { reviewsWrittenOrg } = mapper.toOrganizationDetails(detailsRow);

      expect(reviewsWrittenOrg.map(({ id }) => id)).toEqual([
        'user-review',
        'task-review',
        'system-review',
      ]);
      expect(reviewsWrittenOrg[0]).toMatchObject({
        targetUserId: 'user-id',
        targetUser: { id: 'user-id', name: 'Ann', profile: { avatar: null } },
        targetOrganizationId: null,
        taskId: null,
        task: null,
      });
      expect(reviewsWrittenOrg[1]).toMatchObject({
        taskId: 'task-id',
        task: expect.objectContaining({ picture: 'https://example.com/t.png' }),
        targetUserId: null,
      });
      expect(reviewsWrittenOrg[2]).toMatchObject({
        targetUserId: null,
        targetOrganizationId: null,
        taskId: null,
      });
    });
  });
});
