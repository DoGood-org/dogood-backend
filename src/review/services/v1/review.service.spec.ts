import { HttpStatus } from '@nestjs/common';
import {
  EntityType,
  HostType,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
  ReviewAuthorType,
  ReviewStatus,
  SiteRole,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { AdminReviewTypeV1 } from 'src/review/interfaces/review';
import { ReviewMapperV1 } from 'src/review/mappers/v1/review.mapper';
import { ReviewServiceV1 } from 'src/review/services/v1/review.service';

const reviewDelegate = (): Record<string, jest.Mock> => ({
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('ReviewServiceV1', () => {
  const prisma = {
    userReview: reviewDelegate(),
    organizationReview: reviewDelegate(),
    taskReview: reviewDelegate(),
    systemReview: reviewDelegate(),
    user: { findFirst: jest.fn() },
    organization: { findFirst: jest.fn() },
    task: { findFirst: jest.fn() },
  };
  const notificationService = { createNotification: jest.fn() };
  const service = new ReviewServiceV1(
    prisma as unknown as PrismaService,
    notificationService as unknown as NotificationServiceV2,
    new ReviewMapperV1(),
  );
  const authorId = 'author-id';
  const targetUserId = '11111111-1111-4111-8111-111111111111';
  const createdAt = new Date('2026-09-24T10:00:00Z');
  const updatedAt = new Date('2026-09-24T11:00:00Z');
  const reviewRecord = {
    id: 'review-id',
    rating: 5,
    comment: null,
    authorType: ReviewAuthorType.USER,
    authorUserId: authorId,
    authorOrganizationId: null,
    status: ReviewStatus.PENDING,
    createdAt,
    updatedAt,
  };
  const reviewSelect = {
    id: true,
    rating: true,
    comment: true,
    authorType: true,
    authorUserId: true,
    authorOrganizationId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  };
  const authorSelect = {
    authorUser: {
      select: {
        id: true,
        name: true,
        userProfile: { select: { avatar: true } },
      },
    },
    authorOrganization: { select: { id: true, name: true, avatarUrl: true } },
  };
  const listOrderBy = [
    { createdAt: Prisma.SortOrder.desc },
    { id: Prisma.SortOrder.asc },
  ];
  const listRecord = (id: string, createdAtIso: string): object => ({
    ...reviewRecord,
    id,
    createdAt: new Date(createdAtIso),
    authorUser: {
      id: authorId,
      name: 'Author',
      userProfile: { avatar: 'a.png' },
    },
    authorOrganization: null,
  });
  const lookupAs = (
    table: 'userReview' | 'organizationReview' | 'taskReview' | 'systemReview',
    authorUserId: string | null = authorId,
  ): void => {
    for (const delegate of [
      prisma.userReview,
      prisma.organizationReview,
      prisma.taskReview,
      prisma.systemReview,
    ]) {
      delegate.findFirst.mockResolvedValue(null);
    }

    prisma[table].findFirst.mockResolvedValue({ authorUserId });
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createUserReview', () => {
    const data = { targetUserId, rating: 4, comment: 'Nice' };

    it('should reject a self review with 400 before any query', async () => {
      await expect(
        service.createUserReview(targetUserId, data),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: {
          code: ErrorCode.REVIEW_SELF_FORBIDDEN,
          message: '❌ You cannot leave a review for yourself',
        },
      });
      expect(prisma.userReview.findFirst).not.toHaveBeenCalled();
    });

    it('should reject a duplicate USER review with 409 before the target lookup', async () => {
      prisma.userReview.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createUserReview(authorId, data),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: {
          code: ErrorCode.REVIEW_ALREADY_EXISTS,
          message: '❌ You have already left a review for this user',
        },
      });
      expect(prisma.userReview.findFirst).toHaveBeenCalledWith({
        where: {
          authorType: ReviewAuthorType.USER,
          authorUserId: authorId,
          targetUserId,
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should answer a missing target with a codeless 404', async () => {
      prisma.userReview.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createUserReview(authorId, data),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          status: 'error',
          statusCode: HttpStatus.NOT_FOUND,
          code: null,
          message: 'Target user not found',
        },
      });
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true },
      });
    });

    it('should create a PENDING USER review and synthesize targetType', async () => {
      prisma.userReview.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: targetUserId });
      prisma.userReview.create.mockResolvedValue({
        ...reviewRecord,
        targetUserId,
      });

      const result = await service.createUserReview(authorId, {
        targetUserId,
        rating: 4,
      });

      expect(prisma.userReview.create).toHaveBeenCalledWith({
        data: {
          rating: 4,
          comment: null,
          authorType: ReviewAuthorType.USER,
          authorUserId: authorId,
          targetUserId,
          status: ReviewStatus.PENDING,
        },
        select: { ...reviewSelect, targetUserId: true },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.REVIEW_CREATED,
        data: { ...reviewRecord, targetType: 'USER', targetUserId },
      });
    });
  });

  describe('createTaskUserReview', () => {
    const data = { targetUserId, rating: 3 };

    it('should check self before the task', async () => {
      await expect(
        service.createTaskUserReview(targetUserId, 'task-id', data),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
      expect(prisma.task.findFirst).not.toHaveBeenCalled();
    });

    it('should answer a missing task with 404 REVIEW_NOT_FOUND', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createTaskUserReview(authorId, 'task-id', data),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          code: ErrorCode.REVIEW_NOT_FOUND,
          message: '❌ Task not found',
        },
      });
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-id', deletedAt: null },
        select: { host: { select: { type: true, userId: true } } },
      });
    });

    it.each([
      ['another user host', { type: HostType.USER, userId: 'someone-else' }],
      ['an organization host', { type: HostType.ORGANIZATION, userId: null }],
    ])('should reject %s with 403 REVIEW_FORBIDDEN', async (_label, host) => {
      prisma.task.findFirst.mockResolvedValue({ host });

      await expect(
        service.createTaskUserReview(authorId, 'task-id', data),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: {
          code: ErrorCode.REVIEW_FORBIDDEN,
          message: '❌ Only the host of the task can leave reviews',
        },
      });
      expect(prisma.userReview.findFirst).not.toHaveBeenCalled();
    });

    it('should check duplicates among HOST reviews only and create a HOST review', async () => {
      prisma.task.findFirst.mockResolvedValue({
        host: { type: HostType.USER, userId: authorId },
      });
      prisma.userReview.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: targetUserId });
      prisma.userReview.create.mockResolvedValue({
        ...reviewRecord,
        authorType: ReviewAuthorType.HOST,
        targetUserId,
      });

      await service.createTaskUserReview(authorId, 'task-id', data);

      expect(prisma.userReview.findFirst).toHaveBeenCalledWith({
        where: {
          authorType: ReviewAuthorType.HOST,
          authorUserId: authorId,
          targetUserId,
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(prisma.userReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorType: ReviewAuthorType.HOST }),
        }),
      );
    });

    it('should reject a second HOST review with 409 before the target lookup', async () => {
      prisma.task.findFirst.mockResolvedValue({
        host: { type: HostType.USER, userId: authorId },
      });
      prisma.userReview.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createTaskUserReview(authorId, 'task-id', data),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('createOrganizationReview', () => {
    const targetOrganizationId = '22222222-2222-4222-8222-222222222222';
    const data = { targetOrganizationId, rating: 5, comment: 'Great' };

    it('should reject a duplicate with 409 before the organization lookup', async () => {
      prisma.organizationReview.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createOrganizationReview(authorId, data),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: {
          code: ErrorCode.REVIEW_ALREADY_EXISTS,
          message: '❌ You have already left a review for this organization',
        },
      });
      expect(prisma.organization.findFirst).not.toHaveBeenCalled();
    });

    it('should answer a missing organization with a codeless 404', async () => {
      prisma.organizationReview.findFirst.mockResolvedValue(null);
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrganizationReview(authorId, data),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: null, message: 'Organization not found' },
      });
    });

    it('should create a PENDING organization review', async () => {
      prisma.organizationReview.findFirst.mockResolvedValue(null);
      prisma.organization.findFirst.mockResolvedValue({
        id: targetOrganizationId,
      });
      prisma.organizationReview.create.mockResolvedValue({
        ...reviewRecord,
        targetOrganizationId,
      });

      const result = await service.createOrganizationReview(authorId, data);

      expect(prisma.organizationReview.create).toHaveBeenCalledWith({
        data: {
          rating: 5,
          comment: 'Great',
          authorType: ReviewAuthorType.USER,
          authorUserId: authorId,
          targetOrganizationId,
          status: ReviewStatus.PENDING,
        },
        select: { ...reviewSelect, targetOrganizationId: true },
      });
      expect(result.data).toMatchObject({
        targetType: 'ORGANIZATION',
        targetOrganizationId,
      });
    });
  });

  describe('createPlatformReview', () => {
    it('should reject a duplicate platform review with 409', async () => {
      prisma.systemReview.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createPlatformReview(authorId, { rating: 5 }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: {
          code: ErrorCode.REVIEW_ALREADY_EXISTS,
          message: '❌ You have already left a review for this platform',
        },
      });
      expect(prisma.systemReview.findFirst).toHaveBeenCalledWith({
        where: {
          authorType: ReviewAuthorType.USER,
          authorUserId: authorId,
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should create a PENDING system review with targetType PLATFORM', async () => {
      prisma.systemReview.findFirst.mockResolvedValue(null);
      prisma.systemReview.create.mockResolvedValue(reviewRecord);

      const result = await service.createPlatformReview(authorId, {
        rating: 5,
      });

      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.REVIEW_CREATED,
        data: { ...reviewRecord, targetType: 'PLATFORM' },
      });
    });
  });

  describe('public lists', () => {
    it('should list approved reviews of a user', async () => {
      prisma.userReview.findMany.mockResolvedValue([
        { ...listRecord('r-1', '2026-09-24T10:00:00Z'), targetUserId },
      ]);

      const result = await service.getUserReviews(targetUserId);

      expect(prisma.userReview.findMany).toHaveBeenCalledWith({
        where: { targetUserId, status: ReviewStatus.APPROVED, deletedAt: null },
        orderBy: listOrderBy,
        select: { ...reviewSelect, targetUserId: true, ...authorSelect },
      });
      expect(result.code).toBe(SuccessCode.REVIEWS_RETRIEVED);
      expect(result.data.reviews[0]).toMatchObject({
        id: 'r-1',
        targetType: 'USER',
        author: { id: authorId, name: 'Author', avatar: 'a.png' },
      });
      expect(result.data.reviews[0]).not.toHaveProperty('authorUser');
    });

    it('should list approved reviews of an organization', async () => {
      prisma.organizationReview.findMany.mockResolvedValue([]);

      await service.getOrganizationReviews('org-id');

      expect(prisma.organizationReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            targetOrganizationId: 'org-id',
            status: ReviewStatus.APPROVED,
            deletedAt: null,
          },
        }),
      );
    });

    it('should list only approved system reviews for the platform', async () => {
      prisma.systemReview.findMany.mockResolvedValue([]);

      await service.getPlatformReviews();

      expect(prisma.systemReview.findMany).toHaveBeenCalledWith({
        where: { status: ReviewStatus.APPROVED, deletedAt: null },
        orderBy: listOrderBy,
        select: { ...reviewSelect, ...authorSelect },
      });
      expect(prisma.userReview.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getAdminReviews', () => {
    it('should filter user reviews by target_id and status', async () => {
      prisma.userReview.findMany.mockResolvedValue([]);

      await service.getAdminReviews({
        type: AdminReviewTypeV1.USER,
        status: ReviewStatus.REJECTED,
        target_id: targetUserId,
      });

      expect(prisma.userReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            targetUserId,
            status: ReviewStatus.REJECTED,
            deletedAt: null,
          },
        }),
      );
      expect(prisma.organizationReview.findMany).not.toHaveBeenCalled();
    });

    it('should ignore target_id for platform reviews', async () => {
      prisma.systemReview.findMany.mockResolvedValue([]);

      await service.getAdminReviews({
        type: AdminReviewTypeV1.PLATFORM,
        target_id: targetUserId,
      });

      expect(prisma.systemReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: undefined, deletedAt: null },
        }),
      );
    });

    it('should merge all four tables newest first without a type', async () => {
      prisma.userReview.findMany.mockResolvedValue([
        listRecord('b', '2026-09-20T00:00:00Z'),
      ]);
      prisma.organizationReview.findMany.mockResolvedValue([
        listRecord('d', '2026-09-23T00:00:00Z'),
      ]);
      prisma.taskReview.findMany.mockResolvedValue([
        {
          ...listRecord('c', '2026-09-20T00:00:00Z'),
          taskId: 't',
          hostId: 'h',
        },
      ]);
      prisma.systemReview.findMany.mockResolvedValue([
        listRecord('a', '2026-09-21T00:00:00Z'),
      ]);

      const result = await service.getAdminReviews({
        status: ReviewStatus.PENDING,
      });

      expect(
        result.data.reviews.map(({ id, targetType }) => [id, targetType]),
      ).toEqual([
        ['d', 'ORGANIZATION'],
        ['a', 'PLATFORM'],
        ['b', 'USER'],
        ['c', 'TASK'],
      ]);
      expect(prisma.taskReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ReviewStatus.PENDING, deletedAt: null },
        }),
      );
    });
  });

  describe('updateReview', () => {
    it('should answer an unknown id with 404 REVIEW_NOT_FOUND', async () => {
      lookupAs('userReview');
      prisma.userReview.findFirst.mockResolvedValue(null);

      await expect(
        service.updateReview('missing', authorId, { rating: 2 }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          code: ErrorCode.REVIEW_NOT_FOUND,
          message: '❌ Review not found',
        },
      });
      expect(prisma.systemReview.findFirst).toHaveBeenCalledWith({
        where: { id: 'missing', deletedAt: null },
        select: { authorUserId: true },
      });
    });

    it('should reject a non-author with a codeless 403', async () => {
      lookupAs('organizationReview', 'someone-else');

      await expect(
        service.updateReview('review-id', authorId, { rating: 2 }),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: {
          code: null,
          message: '❌ Only the author can edit their review',
        },
      });
      expect(prisma.organizationReview.update).not.toHaveBeenCalled();
    });

    it('should update rating and comment in the found table and reset status to PENDING', async () => {
      lookupAs('taskReview');
      prisma.taskReview.update.mockResolvedValue({
        id: 'review-id',
        authorType: ReviewAuthorType.HOST,
        authorUserId: authorId,
        authorOrganizationId: null,
        taskId: 't',
        hostId: 'h',
        rating: 2,
        comment: 'meh',
        updatedAt,
      });

      const result = await service.updateReview('review-id', authorId, {
        rating: 2,
        comment: 'meh',
      });

      expect(prisma.taskReview.update).toHaveBeenCalledWith({
        where: { id: 'review-id' },
        data: { rating: 2, comment: 'meh', status: ReviewStatus.PENDING },
        select: {
          id: true,
          authorType: true,
          authorUserId: true,
          authorOrganizationId: true,
          rating: true,
          comment: true,
          updatedAt: true,
          taskId: true,
          hostId: true,
        },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.REVIEW_UPDATED,
        data: {
          id: 'review-id',
          authorType: ReviewAuthorType.HOST,
          authorUserId: authorId,
          authorOrganizationId: null,
          targetType: 'TASK',
          taskId: 't',
          hostId: 'h',
          rating: 2,
          comment: 'meh',
          updatedAt,
        },
      });
    });
  });

  describe('deleteReview', () => {
    it('should reject a user who is neither author nor admin with a codeless 403', async () => {
      lookupAs('userReview', 'someone-else');

      await expect(
        service.deleteReview('review-id', authorId, SiteRole.USER),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: {
          code: null,
          message: '❌ You do not have permission to delete this review',
        },
      });
      expect(prisma.userReview.delete).not.toHaveBeenCalled();
    });

    it('should let a site admin hard delete someone else review', async () => {
      lookupAs('systemReview', 'someone-else');

      const result = await service.deleteReview(
        'review-id',
        authorId,
        SiteRole.ADMIN,
      );

      expect(prisma.systemReview.delete).toHaveBeenCalledWith({
        where: { id: 'review-id' },
        select: { id: true },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.REVIEW_DELETED,
      });
    });

    it('should let the author delete their own review', async () => {
      lookupAs('organizationReview');

      await service.deleteReview('review-id', authorId, SiteRole.USER);

      expect(prisma.organizationReview.delete).toHaveBeenCalled();
    });

    it('should answer an unknown id with 404', async () => {
      lookupAs('userReview');
      prisma.userReview.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteReview('missing', authorId, SiteRole.ADMIN),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });
  });

  describe('moderateReview', () => {
    it('should answer an unknown id with 404 and notify nobody', async () => {
      lookupAs('userReview');
      prisma.userReview.findFirst.mockResolvedValue(null);

      await expect(
        service.moderateReview('missing', { status: ReviewStatus.APPROVED }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.REVIEW_NOT_FOUND },
      });
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should notify the author and the target user on APPROVED', async () => {
      lookupAs('userReview');
      prisma.userReview.update.mockResolvedValue({
        ...reviewRecord,
        status: ReviewStatus.APPROVED,
        targetUserId,
        targetUser: { name: 'Target' },
      });

      const result = await service.moderateReview('review-id', {
        status: ReviewStatus.APPROVED,
      });

      expect(prisma.userReview.update).toHaveBeenCalledWith({
        where: { id: 'review-id' },
        data: { status: ReviewStatus.APPROVED },
        select: {
          ...reviewSelect,
          targetUserId: true,
          targetUser: { select: { name: true } },
        },
      });
      expect(notificationService.createNotification.mock.calls).toEqual([
        [
          {
            userId: authorId,
            type: NotificationType.REVIEW_APPROVED,
            relatedId: 'review-id',
            entityType: EntityType.REVIEW,
            params: { targetName: 'Target' },
          },
        ],
        [
          {
            userId: targetUserId,
            type: NotificationType.REVIEW_RECEIVED,
            relatedId: 'review-id',
            entityType: EntityType.REVIEW,
            params: { targetName: 'you' },
          },
        ],
      ]);
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.REVIEW_MODERATED,
        data: {
          ...reviewRecord,
          status: ReviewStatus.APPROVED,
          targetType: 'USER',
          targetUserId,
        },
      });
      expect(result.data).not.toHaveProperty('targetUser');
    });

    it('should notify every active admin and moderator of the target organization on APPROVED', async () => {
      lookupAs('organizationReview');
      prisma.organizationReview.update.mockResolvedValue({
        ...reviewRecord,
        targetOrganizationId: 'org-id',
        targetOrganization: {
          name: 'Org',
          members: [{ userId: 'admin-id' }, { userId: 'moderator-id' }],
        },
      });

      await service.moderateReview('review-id', {
        status: ReviewStatus.APPROVED,
      });

      expect(prisma.organizationReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            targetOrganization: {
              select: {
                name: true,
                members: {
                  where: {
                    role: {
                      in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR],
                    },
                    status: MembershipStatus.ACTIVE,
                    deletedAt: null,
                  },
                  select: { userId: true },
                },
              },
            },
          }),
        }),
      );
      expect(
        notificationService.createNotification.mock.calls.map(
          ([{ userId, type, params }]) => [userId, type, params],
        ),
      ).toEqual([
        [authorId, NotificationType.REVIEW_APPROVED, { targetName: 'Org' }],
        ['admin-id', NotificationType.REVIEW_RECEIVED, { targetName: 'Org' }],
        [
          'moderator-id',
          NotificationType.REVIEW_RECEIVED,
          { targetName: 'Org' },
        ],
      ]);
    });

    it('should notify only the author on REJECTED', async () => {
      lookupAs('userReview');
      prisma.userReview.update.mockResolvedValue({
        ...reviewRecord,
        targetUserId,
        targetUser: { name: 'Target' },
      });

      await service.moderateReview('review-id', {
        status: ReviewStatus.REJECTED,
      });

      expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: authorId,
          type: NotificationType.REVIEW_REJECTED,
        }),
      );
    });

    it('should name the target Platform for a system review and skip a missing author', async () => {
      lookupAs('systemReview', null);
      prisma.systemReview.update.mockResolvedValue({
        ...reviewRecord,
        authorUserId: null,
      });

      await service.moderateReview('review-id', {
        status: ReviewStatus.APPROVED,
      });

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should name the target Platform for a task review', async () => {
      lookupAs('taskReview');
      prisma.taskReview.update.mockResolvedValue({
        ...reviewRecord,
        taskId: 't',
        hostId: 'h',
      });

      await service.moderateReview('review-id', {
        status: ReviewStatus.APPROVED,
      });

      expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ params: { targetName: 'Platform' } }),
      );
    });
  });
});
