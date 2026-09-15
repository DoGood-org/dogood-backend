import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { I18nService } from 'src/i18n/services/i18n.service';
import {
  CreateNotificationV2,
  NOTIFICATION_CONTENT_LIMITS,
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
      create: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  };
  const notFoundError = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
  let service: NotificationServiceV2;
  let i18nService: I18nService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationServiceV2,
        I18nService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(NotificationServiceV2);
    i18nService = moduleRef.get(I18nService);
  });

  describe('createNotification', () => {
    const validInput: CreateNotificationV2 = {
      userId: '5f8d0d55-3c2a-4b7e-9a1e-2f4b6c8d9e01',
      type: NotificationType.ORG_MEMBER_REMOVED,
      params: { orgName: 'Green City' },
    };
    const untypedInput = (value: unknown): CreateNotificationV2 =>
      JSON.parse(JSON.stringify(value));

    const expectRejectedWithoutWrite = async (
      input: CreateNotificationV2,
    ): Promise<void> => {
      await expect(service.createNotification(input)).rejects.toThrow();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    };

    it('should translate title and body into the user language and store the row', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({ language: 'uk' });
      prisma.notification.create.mockResolvedValue(notification);

      await service.createNotification({
        ...validInput,
        metadata: { orgId: 7, isPublic: true, note: null },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: validInput.userId,
          type: NotificationType.ORG_MEMBER_REMOVED,
          title: 'Вилучено з організації',
          body: 'Вас вилучено з "Green City".',
          relatedId: undefined,
          entityType: undefined,
          metadata: { orgId: 7, isPublic: true, note: null },
        },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
      });
    });

    it('should fall back to English and empty metadata when the user has no settings', async () => {
      prisma.userSettings.findUnique.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue(notification);

      await service.createNotification(validInput);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Removed from Organization',
            body: 'You have been removed from "Green City".',
            metadata: {},
          }),
        }),
      );
    });

    it('should throw and not write when the translation is missing', async () => {
      prisma.userSettings.findUnique.mockResolvedValue(null);
      jest.spyOn(i18nService, 'translate').mockImplementation((key) => key);

      await expect(service.createNotification(validInput)).rejects.toThrow(
        'Notification translation missing: notification.ORG_MEMBER_REMOVED.title (en)',
      );
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should reject HTML in params before touching the database', async () => {
      await expectRejectedWithoutWrite({
        ...validInput,
        params: { orgName: '<script>alert(1)</script>' },
      });
      expect(prisma.userSettings.findUnique).not.toHaveBeenCalled();
    });

    it('should reject HTML in metadata string values', async () => {
      await expectRejectedWithoutWrite({
        ...validInput,
        metadata: { link: '<a href="x">x</a>' },
      });
    });

    it('should reject a param value over the length limit', async () => {
      await expectRejectedWithoutWrite({
        ...validInput,
        params: {
          orgName: 'a'.repeat(
            NOTIFICATION_CONTENT_LIMITS.PARAM_VALUE_MAX_LENGTH + 1,
          ),
        },
      });
    });

    it('should reject a title that exceeds the limit after substitution', async () => {
      prisma.userSettings.findUnique.mockResolvedValue(null);

      await expectRejectedWithoutWrite({
        ...validInput,
        type: NotificationType.CHAT_MESSAGE_RECEIVED,
        params: {
          senderName: 'a'.repeat(
            NOTIFICATION_CONTENT_LIMITS.PARAM_VALUE_MAX_LENGTH,
          ),
          messageText: 'hi',
        },
      });
    });

    it('should reject too many metadata keys', async () => {
      const metadata: Record<string, number> = {};

      for (
        let index = 0;
        index <= NOTIFICATION_CONTENT_LIMITS.METADATA_MAX_KEYS;
        index++
      ) {
        metadata[`key${index}`] = index;
      }

      await expectRejectedWithoutWrite({ ...validInput, metadata });
    });

    it('should reject nested objects and arrays in metadata', async () => {
      await expectRejectedWithoutWrite(
        untypedInput({ ...validInput, metadata: { nested: { a: 1 } } }),
      );
      await expectRejectedWithoutWrite(
        untypedInput({ ...validInput, metadata: { list: [1, 2] } }),
      );
    });

    it('should reject a userId or relatedId that is not a UUID', async () => {
      await expectRejectedWithoutWrite({ ...validInput, userId: 'user-id' });
      await expectRejectedWithoutWrite({
        ...validInput,
        relatedId: 'not-a-uuid',
      });
    });
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
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
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
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
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
