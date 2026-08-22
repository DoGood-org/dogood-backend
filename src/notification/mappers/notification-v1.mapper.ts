import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationV1 } from 'src/notification/interfaces/v1/notification-v1';

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Prisma-рядок → інтерфейс відповіді v1: `readAt` згортається в `isRead`. */
@Injectable()
export class NotificationV1Mapper {
  toNotification(row: NotificationRow): NotificationV1 {
    const {
      id,
      type,
      title,
      body,
      readAt,
      relatedId,
      entityType,
      metadata,
      createdAt,
      updatedAt,
    } = row;

    return {
      id,
      type,
      title,
      body,
      isRead: readAt !== null,
      relatedId,
      entityType,
      metadata,
      createdAt,
      updatedAt,
    };
  }
}
