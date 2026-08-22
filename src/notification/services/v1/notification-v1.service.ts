import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { NotificationV1Mapper } from 'src/notification/mappers/notification-v1.mapper';
import {
  GetNotificationsV1,
  NotificationListV1,
  NotificationV1,
} from 'src/notification/interfaces/v1/notification-v1';

@Injectable()
export class NotificationV1Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationMapper: NotificationV1Mapper,
  ) {}

  async getNotifications(
    userId: string,
    query: GetNotificationsV1,
  ): Promise<NotificationListV1> {
    const { page = 1, limit = 20 } = query;

    // legacy-контракт вимагає `total`, тож другий запит тут свідомий.
    const [notifications, total] = await this.prismaService.$transaction([
      this.prismaService.notification.findMany({
        where: { userId, deletedAt: null },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { createdAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.asc },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.notification.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      data: notifications.map((notification) =>
        this.notificationMapper.toNotification(notification),
      ),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async markNotificationRead(
    userId: string,
    id: string,
  ): Promise<NotificationV1> {
    try {
      const notification = await this.prismaService.notification.update({
        where: { id, userId, deletedAt: null },
        data: { readAt: new Date() },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return this.notificationMapper.toNotification(notification);
    } catch (error) {
      throw this.toNotFound(error);
    }
  }

  /** Ідемпотентно: без непрочитаних просто нічого не оновиться, 404 тут не буває. */
  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.prismaService.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async deleteNotification(userId: string, id: string): Promise<void> {
    try {
      await this.prismaService.notification.update({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
    } catch (error) {
      throw this.toNotFound(error);
    }
  }

  /** Чуже або видалене сповіщення = неіснуюче: завжди 404, ніколи 403. */
  private toNotFound(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Notification not found',
        ErrorCode.NOTIFICATION_NOT_FOUND,
      );
    }

    return error;
  }
}
