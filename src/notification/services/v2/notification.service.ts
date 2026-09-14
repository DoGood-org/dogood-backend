import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  GetMyNotificationsRequestV2,
  MarkAllMyNotificationsReadResultV2,
  NOTIFICATION_SELECT_V2,
  NotificationV2,
} from 'src/notification/interfaces/notification';

@Injectable()
export class NotificationServiceV2 {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(
    userId: string,
    query: GetMyNotificationsRequestV2,
  ): Promise<NotificationV2[]> {
    const { skip = 0, limit = 20 } = query;

    return await this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: NOTIFICATION_SELECT_V2,
    });
  }

  async markAllMyNotificationsRead(
    userId: string,
  ): Promise<MarkAllMyNotificationsReadResultV2> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });

    return { count };
  }

  async markMyNotificationRead(
    userId: string,
    id: string,
  ): Promise<NotificationV2> {
    return await this.updateMyNotification(userId, id, { readAt: new Date() });
  }

  async deleteMyNotification(userId: string, id: string): Promise<void> {
    await this.updateMyNotification(userId, id, { deletedAt: new Date() });
  }

  private async updateMyNotification(
    userId: string,
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<NotificationV2> {
    try {
      return await this.prisma.notification.update({
        where: { id, userId, deletedAt: null },
        data,
        select: NOTIFICATION_SELECT_V2,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Notification not found');
      }

      throw error;
    }
  }
}
