import { NotificationType, Prisma } from '@prisma/client';

/**
 * Форма відповіді v1 — legacy-контракт (`docs/api/notifications.docs.yaml`), не змінювати.
 * `isRead` — похідне від `readAt !== null`; сам `readAt` у v1 не віддається ніколи.
 */
export interface NotificationV1 {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetNotificationsV1 {
  page?: number;
  limit?: number;
}

export interface PaginationV1 {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Результат сервісу — конверт `status` додає контролер. */
export interface NotificationListV1 {
  data: NotificationV1[];
  pagination: PaginationV1;
}

export interface GetNotificationsResponseV1 extends NotificationListV1 {
  status: 'success';
}

export interface MarkNotificationReadResponseV1 {
  status: 'success';
  data: NotificationV1;
}

export interface MarkAllNotificationsReadResponseV1 {
  status: 'success';
  message: string;
}

export interface DeleteNotificationResponseV1 {
  status: 'success';
}
