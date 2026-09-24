import { ReviewAuthorType, ReviewStatus } from '@prisma/client';
import { ReviewTargetTypeV1 } from 'src/review/interfaces/review';
import { ReviewMapperV1 } from 'src/review/mappers/v1/review.mapper';

describe('ReviewMapperV1', () => {
  const mapper = new ReviewMapperV1();
  const record = {
    id: 'review-id',
    rating: 4,
    comment: null,
    authorType: ReviewAuthorType.USER,
    authorUserId: 'author-id',
    authorOrganizationId: null,
    status: ReviewStatus.APPROVED,
    createdAt: new Date('2026-09-24T10:00:00Z'),
    updatedAt: new Date('2026-09-24T11:00:00Z'),
  };

  describe('toReview', () => {
    it('should put targetType before the target ids and keep only the ids present', () => {
      const review = mapper.toReview(ReviewTargetTypeV1.TASK, {
        ...record,
        taskId: 'task-id',
        hostId: 'host-id',
      });

      expect(Object.keys(review)).toEqual([
        'id',
        'rating',
        'comment',
        'authorType',
        'authorUserId',
        'authorOrganizationId',
        'targetType',
        'taskId',
        'hostId',
        'status',
        'createdAt',
        'updatedAt',
      ]);
      expect(review.targetType).toBe(ReviewTargetTypeV1.TASK);
    });
  });

  describe('toReviewListItem', () => {
    it('should take the author from the user and drop the relation keys', () => {
      const item = mapper.toReviewListItem(ReviewTargetTypeV1.USER, {
        ...record,
        targetUserId: 'target-id',
        authorUser: {
          id: 'author-id',
          name: 'Author',
          userProfile: { avatar: 'a.png' },
        },
        authorOrganization: null,
      });

      expect(item.author).toEqual({
        id: 'author-id',
        name: 'Author',
        avatar: 'a.png',
      });
      expect(item).not.toHaveProperty('authorUser');
      expect(item).not.toHaveProperty('authorOrganization');
    });

    it('should fall back to the organization author', () => {
      const item = mapper.toReviewListItem(ReviewTargetTypeV1.PLATFORM, {
        ...record,
        authorUser: null,
        authorOrganization: { id: 'org-id', name: 'Org', avatarUrl: 'o.png' },
      });

      expect(item.author).toEqual({
        id: 'org-id',
        name: 'Org',
        avatar: 'o.png',
      });
    });

    it('should leave avatar undefined when the user author has none (legacy ||)', () => {
      const item = mapper.toReviewListItem(ReviewTargetTypeV1.USER, {
        ...record,
        authorUser: { id: 'author-id', name: 'Author', userProfile: null },
        authorOrganization: null,
      });

      expect(item.author.avatar).toBeUndefined();
      expect(JSON.parse(JSON.stringify(item.author))).toEqual({
        id: 'author-id',
        name: 'Author',
      });
    });
  });

  describe('toUpdatedReview', () => {
    it('should return the legacy update field set with targetType', () => {
      const {
        id,
        authorType,
        authorUserId,
        authorOrganizationId,
        rating,
        comment,
        updatedAt,
      } = record;

      expect(
        mapper.toUpdatedReview(ReviewTargetTypeV1.ORGANIZATION, {
          id,
          authorType,
          authorUserId,
          authorOrganizationId,
          targetOrganizationId: 'org-id',
          rating,
          comment,
          updatedAt,
        }),
      ).toEqual({
        id,
        authorType,
        authorUserId,
        authorOrganizationId,
        targetType: ReviewTargetTypeV1.ORGANIZATION,
        targetOrganizationId: 'org-id',
        rating,
        comment,
        updatedAt,
      });
    });
  });
});
