import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import {
  GetMyNotificationsRequestV1,
  MyNotificationsResponseV1,
  NOTIFICATION_SELECT_V1,
  NotificationMessageResponseV1,
  NotificationResponseV1,
  NotificationRowV1,
} from 'src/notification/interfaces/notification';
import { NotificationMapperV1 } from 'src/notification/mappers/v1/notification.mapper';

@Injectable()
export class NotificationServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationMapper: NotificationMapperV1,
  ) {}

  async getMyNotifications(
    userId: string,
    query: GetMyNotificationsRequestV1,
  ): Promise<MyNotificationsResponseV1> {
    const { page: rawPage, limit: rawLimit } = query;
    // NOTE: parsed exactly like the legacy Express handler: no bounds, a negative page makes Prisma throw.
    const page = parseInt(rawPage ?? '') || 1;
    const limit = parseInt(rawLimit ?? '') || 20;
    const where: Prisma.NotificationWhereInput = { userId, deletedAt: null };

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: (page - 1) * limit,
        take: limit,
        select: NOTIFICATION_SELECT_V1,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return this.notificationMapper.toMyNotificationsResponse({
      rows,
      total,
      page,
      limit,
    });
  }

  async markAllMyNotificationsRead(
    userId: string,
  ): Promise<NotificationMessageResponseV1> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });

    return this.notificationMapper.toNotificationMessageResponse(
      'All notifications marked as read',
    );
  }

  async markMyNotificationRead(
    userId: string,
    id: string,
  ): Promise<NotificationResponseV1> {
    const row = await this.updateMyNotification(userId, id, {
      readAt: new Date(),
    });

    return this.notificationMapper.toNotificationResponse(row);
  }

  async deleteMyNotification(
    userId: string,
    id: string,
  ): Promise<NotificationMessageResponseV1> {
    await this.updateMyNotification(userId, id, { deletedAt: new Date() });

    return this.notificationMapper.toNotificationMessageResponse(
      'Notification removed',
    );
  }

  private async updateMyNotification(
    userId: string,
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<NotificationRowV1> {
    try {
      return await this.prisma.notification.update({
        where: { id, userId, deletedAt: null },
        data,
        select: NOTIFICATION_SELECT_V1,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new V1ApiException(
          HttpStatus.NOT_FOUND,
          'Notification not found',
          ErrorCode.NOTIFICATION_NOT_FOUND,
        );
      }

      throw error;
    }
  }
}
