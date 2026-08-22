import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  GetNotificationsV2,
  NotificationSortField,
} from 'src/notification/interfaces/v2/get-notifications';
import {
  MarkAllNotificationsReadV2,
  NotificationV2,
} from 'src/notification/interfaces/v2/notification-v2';

@Injectable()
export class NotificationV2Service {
  constructor(private readonly prismaService: PrismaService) {}

  async getNotifications(
    userId: string,
    query: GetNotificationsV2,
  ): Promise<NotificationV2[]> {
    const {
      search,
      sort = NotificationSortField.CREATED_AT,
      sortDirection = Prisma.SortOrder.desc,
      skip = 0,
      limit = 20,
      isRead,
    } = query;

    return this.prismaService.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        readAt:
          isRead === undefined ? undefined : isRead ? { not: null } : null,
        OR: search
          ? [
              {
                title: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
              {
                body: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
            ]
          : undefined,
      },
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
      },
      orderBy: [{ [sort]: sortDirection }, { id: Prisma.SortOrder.asc }],
      skip,
      take: limit,
    });
  }

  async markNotificationRead(
    userId: string,
    id: string,
  ): Promise<NotificationV2> {
    try {
      return await this.prismaService.notification.update({
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
        },
      });
    } catch (error) {
      throw this.toNotFound(error);
    }
  }

  async markAllNotificationsRead(
    userId: string,
  ): Promise<MarkAllNotificationsReadV2> {
    const { count } = await this.prismaService.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: count };
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
      return new NotFoundException('Notification not found');
    }

    return error;
  }
}
