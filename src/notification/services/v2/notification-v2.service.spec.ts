import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NotificationV2Service } from 'src/notification/services/v2/notification-v2.service';
import { getNotificationsV2Schema } from 'src/notification/dto/v2/requests';

/** Форма аргументу `notification.findMany`, щоб типізовано читати mock.calls. */
type FindManyCall = {
  where: {
    userId: string;
    deletedAt: null;
    readAt?: unknown;
    OR?: unknown;
  };
  orderBy: unknown;
  skip: number;
  take: number;
};

describe('NotificationV2Service', () => {
  let service: NotificationV2Service;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const userId = '11111111-1111-4111-8111-111111111111';
  const notificationId = '22222222-2222-4222-8222-222222222222';
  const createdAt = new Date('2026-08-01T10:00:00.000Z');

  const row = {
    id: notificationId,
    type: NotificationType.TASK_VALIDATED,
    title: 'Task validated',
    body: 'Your task was validated',
    readAt: null,
    relatedId: null,
    entityType: null,
    metadata: null,
    createdAt,
  };

  const notFound = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });

  const firstFindManyCall = (): FindManyCall =>
    mockPrismaService.notification.findMany.mock.calls[0][0] as FindManyCall;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationV2Service,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationV2Service>(NotificationV2Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should successfully apply the defaults: newest first, id tiebreaker, no total', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([row]);

      const result = await service.getNotifications(userId, {});

      expect(result).toEqual([row]);
      expect(firstFindManyCall()).toEqual(
        expect.objectContaining({
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should successfully scope the query to the caller and skip deleted rows', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications(userId, {});

      const { where } = firstFindManyCall();

      expect(where.userId).toBe(userId);
      expect(where.deletedAt).toBeNull();
      // Без фільтра isRead віддаємо і прочитані, і непрочитані.
      expect(where.readAt).toBeUndefined();
    });

    it('should successfully filter unread notifications when isRead is false', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications(userId, { isRead: false });

      expect(firstFindManyCall().where.readAt).toBeNull();
    });

    it('should successfully filter read notifications when isRead is true', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications(userId, { isRead: true });

      expect(firstFindManyCall().where.readAt).toEqual({ not: null });
    });

    it('should successfully search title and body case-insensitively', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications(userId, { search: 'invite' });

      expect(firstFindManyCall().where.OR).toEqual([
        {
          title: { contains: 'invite', mode: Prisma.QueryMode.insensitive },
        },
        { body: { contains: 'invite', mode: Prisma.QueryMode.insensitive } },
      ]);
    });

    it('should successfully honour an explicit skip, limit and sortDirection', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications(userId, {
        skip: 40,
        limit: 10,
        sortDirection: Prisma.SortOrder.asc,
      });

      expect(firstFindManyCall()).toEqual(
        expect.objectContaining({
          skip: 40,
          take: 10,
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
        }),
      );
    });
  });

  describe('getNotificationsV2Schema', () => {
    it('should parse isRead=false as false, not as a truthy string', () => {
      expect(getNotificationsV2Schema.parse({ isRead: 'false' }).isRead).toBe(
        false,
      );
      expect(getNotificationsV2Schema.parse({ isRead: 'true' }).isRead).toBe(
        true,
      );
      expect(getNotificationsV2Schema.parse({}).isRead).toBeUndefined();
    });

    it('should coerce the numeric query params', () => {
      expect(
        getNotificationsV2Schema.parse({ skip: '40', limit: '10' }),
      ).toEqual({ skip: 40, limit: 10 });
    });
  });

  describe('markNotificationRead', () => {
    it('should successfully scope the update to the caller and expose readAt', async () => {
      const readAt = new Date('2026-08-02T10:00:00.000Z');
      mockPrismaService.notification.update.mockResolvedValue({
        ...row,
        readAt,
      });

      const result = await service.markNotificationRead(userId, notificationId);

      expect(result.readAt).toBe(readAt);
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
      ).rejects.toThrow(NotFoundException);
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
    it('should successfully return the number of updated notifications', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 7 });

      const result = await service.markAllNotificationsRead(userId);

      expect(result).toEqual({ updated: 7 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, deletedAt: null, readAt: null },
        }),
      );
    });

    it('should stay idempotent and return zero when there is nothing unread', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAllNotificationsRead(userId)).resolves.toEqual({
        updated: 0,
      });
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
      ).rejects.toThrow(NotFoundException);
    });
  });
});
