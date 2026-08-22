import { NotificationType } from '@prisma/client';
import { NotificationV1Mapper } from 'src/notification/mappers/notification-v1.mapper';

describe('NotificationV1Mapper', () => {
  const mapper = new NotificationV1Mapper();

  const row = {
    id: '55555555-5555-4555-8555-555555555555',
    type: NotificationType.TASK_VALIDATED,
    title: 'Task validated',
    body: 'Your task was validated',
    readAt: null as Date | null,
    relatedId: null,
    entityType: null,
    metadata: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };

  it('should map a null readAt to isRead false and never expose readAt', () => {
    const result = mapper.toNotification(row);

    expect(result).toEqual({
      id: row.id,
      type: NotificationType.TASK_VALIDATED,
      title: 'Task validated',
      body: 'Your task was validated',
      isRead: false,
      relatedId: null,
      entityType: null,
      metadata: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    expect(result).not.toHaveProperty('readAt');
  });

  it('should map a set readAt to isRead true', () => {
    const result = mapper.toNotification({
      ...row,
      readAt: new Date('2026-08-02T10:00:00.000Z'),
    });

    expect(result.isRead).toBe(true);
    expect(result).not.toHaveProperty('readAt');
  });

  it('should pass relatedId, entityType and metadata through untouched', () => {
    const result = mapper.toNotification({
      ...row,
      relatedId: '66666666-6666-4666-8666-666666666666',
      entityType: 'TASK',
      metadata: { taskId: 7 },
    });

    expect(result.relatedId).toBe('66666666-6666-4666-8666-666666666666');
    expect(result.entityType).toBe('TASK');
    expect(result.metadata).toEqual({ taskId: 7 });
  });
});
