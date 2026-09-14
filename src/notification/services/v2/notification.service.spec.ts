import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  NOTIFICATION_SELECT_V2,
  NotificationV2,
} from 'src/notification/interfaces/notification';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';

describe('NotificationServiceV2', () => {
  const userId = 'user-id';
  const notification: NotificationV2 = {
    id: 'notification-id',
    type: NotificationType.TASK_VALIDATED,
    title: 'Task Validated',
    body: 'Task "Clean park" has been approved.',
    relatedId: null,
    entityType: null,
    metadata: null,
    readAt: null,
    createdAt: new Date('2026-09-14T10:00:00Z'),
  };
  const prisma = {
    notification: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const notFoundError = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
  let service: NotificationServiceV2;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationServiceV2,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(NotificationServiceV2);
  });

  describe('getMyNotifications', () => {
    it('should query one page with defaults, explicit select and an id tiebreaker', async () => {
      prisma.notification.findMany.mockResolvedValue([notification]);

      const notifications = await service.getMyNotifications(userId, {});

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 20,
        select: NOTIFICATION_SELECT_V2,
      });
      expect(notifications).toEqual([notification]);
    });

    it('should pass skip and limit through', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.getMyNotifications(userId, { skip: 40, limit: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 10 }),
      );
    });
  });

  describe('markAllMyNotificationsRead', () => {
    it('should mark only unread, not deleted notifications and return the count', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.markAllMyNotificationsRead(userId)).resolves.toEqual(
        { count: 3 },
      );
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, readAt: null, deletedAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('markMyNotificationRead', () => {
    it('should update an own, not deleted notification with the v2 select', async () => {
      prisma.notification.update.mockResolvedValue(notification);

      await service.markMyNotificationRead(userId, notification.id);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notification.id, userId, deletedAt: null },
        data: { readAt: expect.any(Date) },
        select: NOTIFICATION_SELECT_V2,
      });
    });

    it('should throw NotFoundException for a foreign or missing notification', async () => {
      prisma.notification.update.mockRejectedValue(notFoundError);

      await expect(
        service.markMyNotificationRead(userId, 'other-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should rethrow errors other than P2025', async () => {
      const failure = new Error('connection lost');
      prisma.notification.update.mockRejectedValue(failure);

      await expect(
        service.markMyNotificationRead(userId, notification.id),
      ).rejects.toBe(failure);
    });
  });

  describe('deleteMyNotification', () => {
    it('should soft delete an own notification', async () => {
      prisma.notification.update.mockResolvedValue(notification);

      await service.deleteMyNotification(userId, notification.id);

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notification.id, userId, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw NotFoundException when the notification is already deleted', async () => {
      prisma.notification.update.mockRejectedValue(notFoundError);

      await expect(
        service.deleteMyNotification(userId, notification.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
