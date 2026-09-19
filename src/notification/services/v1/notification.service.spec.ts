import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { NotificationRowV1 } from 'src/notification/interfaces/notification';
import { NotificationMapperV1 } from 'src/notification/mappers/v1/notification.mapper';
import { NotificationServiceV1 } from 'src/notification/services/v1/notification.service';

describe('NotificationServiceV1', () => {
  const userId = 'user-id';
  const row: NotificationRowV1 = {
    id: 'notification-id',
    userId,
    type: NotificationType.REVIEW_RECEIVED,
    title: 'New Review',
    body: 'You received a new review for "Park".',
    relatedId: null,
    entityType: null,
    metadata: null,
    readAt: null,
    createdAt: new Date('2026-09-14T10:00:00Z'),
  };
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const notFoundError = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
  let service: NotificationServiceV1;

  const catchError = async (promise: Promise<unknown>): Promise<unknown> => {
    try {
      await promise;
    } catch (error) {
      return error;
    }

    throw new Error('Expected the promise to reject');
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationServiceV1,
        NotificationMapperV1,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(NotificationServiceV1);
  });

  describe('getMyNotifications', () => {
    it('should default page to 1 and limit to 20 and skip soft-deleted rows', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const response = await service.getMyNotifications(userId, {});

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
      });
      expect(response).toEqual({
        status: 'success',
        data: [],
        pagination: { total: 0, page: 1, limit: 20, pages: 0 },
      });
    });

    it('should fall back to defaults for unparsable and zero values like legacy parseInt', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const response = await service.getMyNotifications(userId, {
        page: 'abc',
        limit: '0',
      });

      expect(response.pagination).toMatchObject({ page: 1, limit: 20 });
    });

    it('should compute skip and pages from page and limit', async () => {
      prisma.notification.findMany.mockResolvedValue([row]);
      prisma.notification.count.mockResolvedValue(11);

      const response = await service.getMyNotifications(userId, {
        page: '3',
        limit: '5',
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
      expect(response.pagination).toEqual({
        total: 11,
        page: 3,
        limit: 5,
        pages: 3,
      });
      expect(response.data[0].isRead).toBe(false);
    });

    it('should return an empty page with the real total when page is out of range', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(1);

      const response = await service.getMyNotifications(userId, { page: '5' });

      expect(response.data).toEqual([]);
      expect(response.pagination).toEqual({
        total: 1,
        page: 5,
        limit: 20,
        pages: 1,
      });
    });
  });

  describe('markAllMyNotificationsRead', () => {
    it('should update only unread, not deleted notifications of the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const response = await service.markAllMyNotificationsRead(userId);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, readAt: null, deletedAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(response).toEqual({
        status: 'success',
        message: 'All notifications marked as read',
      });
    });
  });

  describe('markMyNotificationRead', () => {
    it('should set readAt on an own, not deleted notification and return isRead', async () => {
      prisma.notification.update.mockResolvedValue({
        ...row,
        readAt: new Date(),
      });

      const response = await service.markMyNotificationRead(userId, row.id);

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: row.id, userId, deletedAt: null },
          data: { readAt: expect.any(Date) },
        }),
      );
      expect(response.data.isRead).toBe(true);
    });

    it('should throw 404 NOTIFICATION_NOT_FOUND for a foreign or missing notification', async () => {
      prisma.notification.update.mockRejectedValue(notFoundError);

      const error = await catchError(
        service.markMyNotificationRead(userId, 'other-id'),
      );

      expect(error).toBeInstanceOf(HttpException);

      if (error instanceof HttpException) {
        expect(error.getStatus()).toBe(404);
        expect(error.getResponse()).toEqual({
          status: 'error',
          statusCode: 404,
          code: ErrorCode.NOTIFICATION_NOT_FOUND,
          message: 'Notification not found',
        });
      }
    });

    it('should rethrow errors other than P2025', async () => {
      const failure = new Error('connection lost');
      prisma.notification.update.mockRejectedValue(failure);

      await expect(service.markMyNotificationRead(userId, row.id)).rejects.toBe(
        failure,
      );
    });
  });

  describe('deleteMyNotification', () => {
    it('should soft delete an own notification', async () => {
      prisma.notification.update.mockResolvedValue(row);

      const response = await service.deleteMyNotification(userId, row.id);

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: row.id, userId, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(response).toEqual({
        status: 'success',
        message: 'Notification removed',
      });
    });

    it('should throw 404 when the notification is already deleted', async () => {
      prisma.notification.update.mockRejectedValue(notFoundError);

      const error = await catchError(
        service.deleteMyNotification(userId, row.id),
      );

      expect(error).toBeInstanceOf(HttpException);

      if (error instanceof HttpException) {
        expect(error.getStatus()).toBe(404);
      }
    });
  });
});
