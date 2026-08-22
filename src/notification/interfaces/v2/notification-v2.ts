import { NotificationType, Prisma } from '@prisma/client';

/** v2 віддає сирий `readAt` замість похідного `isRead`. */
export interface NotificationV2 {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface MarkAllNotificationsReadV2 {
  updated: number;
}
