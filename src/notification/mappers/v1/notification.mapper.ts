import { Injectable } from '@nestjs/common';
import {
  MyNotificationsPageV1,
  MyNotificationsResponseV1,
  NotificationMessageResponseV1,
  NotificationResponseV1,
  NotificationRowV1,
  NotificationV1,
} from 'src/notification/interfaces/notification';

@Injectable()
export class NotificationMapperV1 {
  toNotification(row: NotificationRowV1): NotificationV1 {
    const {
      id,
      userId,
      type,
      title,
      body,
      relatedId,
      entityType,
      metadata,
      readAt,
      createdAt,
    } = row;

    return {
      id,
      userId,
      type,
      title,
      body,
      relatedId,
      entityType,
      metadata,
      isRead: readAt !== null,
      createdAt,
    };
  }

  toMyNotificationsResponse(
    notificationsPage: MyNotificationsPageV1,
  ): MyNotificationsResponseV1 {
    const { rows, total, page, limit } = notificationsPage;

    return {
      status: 'success',
      data: rows.map((row) => this.toNotification(row)),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  toNotificationResponse(row: NotificationRowV1): NotificationResponseV1 {
    return { status: 'success', data: this.toNotification(row) };
  }

  toNotificationMessageResponse(
    message: string,
  ): NotificationMessageResponseV1 {
    return { status: 'success', message };
  }
}
