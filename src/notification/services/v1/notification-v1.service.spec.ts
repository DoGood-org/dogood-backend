import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { NotificationV1Mapper } from 'src/notification/mappers/notification-v1.mapper';
import { NotificationV1Service } from 'src/notification/services/v1/notification-v1.service';

/**
 * v1 відтворює legacy-контракт `docs/api/notifications.docs.yaml`:
 * page/limit + pagination, `isRead` замість `readAt`, 404 на чуже сповіщення.
 */
describe('NotificationV1Service', () => {
  let service: NotificationV1Service;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const userId = '11111111-1111-4111-8111-111111111111';
  const notificationId = '22222222-2222-4222-8222-222222222222';
  const createdAt = new Date('2026-08-01T10:00:00.000Z');

  const row = {
    id: notificationId,
    type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
    title: 'Join request',
    body: 'Someone asked to join',
    readAt: null as Date | null,
    relatedId: null,
    entityType: null,
    metadata: null,
    createdAt,
    updatedAt: createdAt,
  };

  const notFound = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationV1Service,
        NotificationV1Mapper,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationV1Service>(NotificationV1Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should successfully scope the query to the caller and skip deleted rows', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[row], 1]);

      await service.getNotifications(userId, {});

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId, deletedAt: null } }),
      );
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
      });
    });

    it('should successfully apply the default page and limit', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[row], 1]);

      const result = await service.getNotifications(userId, {});

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      });
    });

    it('should successfully translate page and limit into skip and take', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 45]);

      const result = await service.getNotifications(userId, {
        page: 2,
        limit: 20,
      });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result.pagination).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        pages: 3,
      });
    });

    it('should return zero pages when nothing matches', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      const result = await service.getNotifications(userId, {});

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      });
    });

    it('should order newest first with the id tiebreaker', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[row], 1]);

      await service.getNotifications(userId, {});

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
        }),
      );
    });

    it('should successfully map readAt into isRead and hide readAt', async () => {
      mockPrismaService.$transaction.mockResolvedValue([
        [row, { ...row, readAt: new Date('2026-08-02T10:00:00.000Z') }],
        2,
      ]);

      const result = await service.getNotifications(userId, {});

      expect(result.data[0].isRead).toBe(false);
      expect(result.data[1].isRead).toBe(true);
      expect(result.data[0]).not.toHaveProperty('readAt');
    });
  });

  describe('markNotificationRead', () => {
    it('should successfully scope the update to the caller and return isRead true', async () => {
      mockPrismaService.notification.update.mockResolvedValue({
        ...row,
        readAt: new Date('2026-08-02T10:00:00.000Z'),
      });

      const result = await service.markNotificationRead(userId, notificationId);

      expect(result.isRead).toBe(true);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notificationId, userId, deletedAt: null },
        }),
      );
    });

    it("should throw a 404 for another user's or a deleted notification", async () => {
      mockPrismaService.notification.update.mockRejectedValue(notFound);

      await expect(
        service.markNotificationRead(userId, notificationId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: {
          status: 'error',
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        },
      });
    });

    it('should rethrow errors that are not P2025', async () => {
      const boom = new Error('connection lost');
      mockPrismaService.notification.update.mockRejectedValue(boom);

      await expect(
        service.markNotificationRead(userId, notificationId),
      ).rejects.toBe(boom);
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should successfully mark only the unread notifications of the caller', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 7 });

      await service.markAllNotificationsRead(userId);

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, deletedAt: null, readAt: null },
        }),
      );
    });

    it('should stay idempotent when there is nothing unread', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.markAllNotificationsRead(userId),
      ).resolves.toBeUndefined();
    });
  });

  describe('deleteNotification', () => {
    it('should soft delete and never remove the row', async () => {
      mockPrismaService.notification.update.mockResolvedValue({
        id: notificationId,
      });

      await service.deleteNotification(userId, notificationId);

      const call = mockPrismaService.notification.update.mock.calls[0][0] as {
        where: unknown;
        data: { deletedAt: Date };
      };

      expect(call.where).toEqual({
        id: notificationId,
        userId,
        deletedAt: null,
      });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw a 404 when the notification does not belong to the caller', async () => {
      mockPrismaService.notification.update.mockRejectedValue(notFound);

      await expect(
        service.deleteNotification(userId, notificationId),
      ).rejects.toBeInstanceOf(V1ApiException);
    });
  });
});
