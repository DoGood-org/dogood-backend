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

  describe('toAdminReviewListItem', () => {
    const userAuthor = {
      id: 'author-id',
      name: 'Author',
      email: 'author@example.com',
      userProfile: { avatar: 'a.png' },
    };

    it('should add the author email and the target user, dropping the relation keys', () => {
      const item = mapper.toAdminReviewListItem(ReviewTargetTypeV1.USER, {
        ...record,
        targetUserId: 'target-id',
        authorUser: userAuthor,
        authorOrganization: null,
        targetUser: {
          id: 'target-id',
          name: 'Target',
          userProfile: null,
        },
      });

      expect(item.targetName).toEqual({
        id: 'target-id',
        name: 'Target',
        avatar: null,
      });
      expect(item.author).toEqual({
        id: 'author-id',
        name: 'Author',
        avatar: 'a.png',
        email: 'author@example.com',
      });
      expect(item.targetUserId).toBe('target-id');

      for (const key of ['authorUser', 'authorOrganization', 'targetUser']) {
        expect(item).not.toHaveProperty(key);
      }
    });

    it('should take the target from the organization and the email from an organization author', () => {
      const item = mapper.toAdminReviewListItem(
        ReviewTargetTypeV1.ORGANIZATION,
        {
          ...record,
          targetOrganizationId: 'org-id',
          authorUser: null,
          authorOrganization: {
            id: 'author-org',
            name: 'Author Org',
            avatarUrl: null,
            email: 'org@example.com',
          },
          targetOrganization: { id: 'org-id', name: 'Org', avatarUrl: 'o.png' },
        },
      );

      expect(item.targetName).toEqual({
        id: 'org-id',
        name: 'Org',
        avatar: 'o.png',
      });
      expect(item.author.email).toBe('org@example.com');
      expect(item).not.toHaveProperty('targetOrganization');
    });

    it('should name a task target by its title', () => {
      const item = mapper.toAdminReviewListItem(ReviewTargetTypeV1.TASK, {
        ...record,
        taskId: 'task-id',
        hostId: 'host-id',
        authorUser: userAuthor,
        authorOrganization: null,
        task: { id: 'task-id', title: 'Clean the park', imageUrl: null },
      });

      expect(item.targetName).toEqual({
        id: 'task-id',
        name: 'Clean the park',
        avatar: null,
      });
      expect(item).not.toHaveProperty('task');
    });

    it('should give a platform review the fixed Platform target and a null email without an author', () => {
      const item = mapper.toAdminReviewListItem(ReviewTargetTypeV1.PLATFORM, {
        ...record,
        authorUser: null,
        authorOrganization: null,
      });

      expect(item.targetName).toEqual({
        id: null,
        name: 'Platform',
        avatar: null,
      });
      expect(item.author.email).toBeNull();
    });

    it('should answer a null target when the relation is missing', () => {
      const item = mapper.toAdminReviewListItem(ReviewTargetTypeV1.USER, {
        ...record,
        authorUser: userAuthor,
        authorOrganization: null,
      });

      expect(item.targetName).toBeNull();
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
