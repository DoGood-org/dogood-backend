import { NotificationType } from '@prisma/client';
import { NotificationRowV1 } from 'src/notification/interfaces/notification';
import { NotificationMapperV1 } from 'src/notification/mappers/v1/notification.mapper';

describe('NotificationMapperV1', () => {
  const mapper = new NotificationMapperV1();
  const row: NotificationRowV1 = {
    id: 'notification-id',
    userId: 'user-id',
    type: NotificationType.TASK_CLOSED,
    title: 'Task Closed',
    body: 'Task "Clean park" is now closed.',
    relatedId: null,
    entityType: null,
    metadata: { taskTitle: 'Clean park' },
    readAt: null,
    createdAt: new Date('2026-09-14T10:00:00Z'),
  };

  describe('toNotification', () => {
    it('should map a null readAt to isRead false and drop readAt', () => {
      const notification = mapper.toNotification(row);

      expect(notification.isRead).toBe(false);
      expect(notification).not.toHaveProperty('readAt');
      expect(notification.userId).toBe('user-id');
    });

    it('should map a set readAt to isRead true', () => {
      expect(mapper.toNotification({ ...row, readAt: new Date() }).isRead).toBe(
        true,
      );
    });
  });

  describe('toMyNotificationsResponse', () => {
    it('should report zero pages for an empty feed', () => {
      expect(
        mapper.toMyNotificationsResponse({
          rows: [],
          total: 0,
          page: 1,
          limit: 20,
        }).pagination,
      ).toEqual({ total: 0, page: 1, limit: 20, pages: 0 });
    });

    it('should round pages up', () => {
      const response = mapper.toMyNotificationsResponse({
        rows: [row],
        total: 11,
        page: 3,
        limit: 5,
      });

      expect(response.pagination.pages).toBe(3);
      expect(response.status).toBe('success');
      expect(response.data).toHaveLength(1);
    });
  });
});
