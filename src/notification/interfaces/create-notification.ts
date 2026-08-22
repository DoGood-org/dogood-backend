import { NotificationType, Prisma } from '@prisma/client';

/**
 * Вхід внутрішнього `NotificationService.create` — не HTTP-поверхня, тож без версії.
 * `title`/`body` приходять уже складеними та перекладеними на боці викликача.
 */
export interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId?: string;
  entityType?: string;
  metadata?: Prisma.InputJsonValue;
}
