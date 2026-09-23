import { CategoryType, HostType, TaskStatus } from '@prisma/client';
import { TaskParticipantRowV2, TaskRowV2 } from 'src/task/interfaces/task';
import { TaskMapperV2 } from 'src/task/mappers/v2/task.mapper';

describe('TaskMapperV2', () => {
  const row: TaskRowV2 = {
    id: 'task-id',
    title: 'Clean park',
    description: 'Bring gloves',
    imageUrl: null,
    startDate: new Date('2026-10-01T09:00:00Z'),
    endDate: null,
    status: TaskStatus.PENDING,
    categories: [CategoryType.NATURE],
    amount: null,
    currentAmount: null,
    currency: null,
    requirements: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    taskLocation: { name: 'Central park', latitude: 50.45, longitude: 30.52 },
    host: {
      id: 'host-id',
      type: HostType.USER,
      user: { name: 'Ann', userProfile: { avatar: 'https://cdn.test/a.png' } },
      organization: null,
    },
  };
  const mapper = new TaskMapperV2();

  describe('toTask', () => {
    it('should flatten the task location into the task itself', () => {
      const task = mapper.toTask(row);

      expect(task.locationName).toBe('Central park');
      expect(task.latitude).toBe(50.45);
      expect(task.longitude).toBe(30.52);
    });

    it('should null every location field when the task has no location', () => {
      const task = mapper.toTask({ ...row, taskLocation: null });

      expect(task.locationName).toBeNull();
      expect(task.latitude).toBeNull();
      expect(task.longitude).toBeNull();
    });

    it('should flatten a user host into one name and avatar', () => {
      expect(mapper.toTask(row).host).toEqual({
        id: 'host-id',
        type: HostType.USER,
        name: 'Ann',
        avatar: 'https://cdn.test/a.png',
      });
    });

    it('should flatten an organization host into one name and avatar', () => {
      const task = mapper.toTask({
        ...row,
        host: {
          id: 'host-id',
          type: HostType.ORGANIZATION,
          user: null,
          organization: {
            name: 'Green city',
            avatarUrl: 'https://cdn.test/org.png',
          },
        },
      });

      expect(task.host).toEqual({
        id: 'host-id',
        type: HostType.ORGANIZATION,
        name: 'Green city',
        avatar: 'https://cdn.test/org.png',
      });
    });
  });

  describe('toTaskParticipants', () => {
    it('should map participants to id, name, avatar and joinedAt', () => {
      const participantRow: TaskParticipantRowV2 = {
        createdAt: new Date('2026-09-05T10:00:00Z'),
        user: { id: 'user-id', name: 'Bob', userProfile: null },
      };

      expect(mapper.toTaskParticipants([participantRow])).toEqual([
        {
          id: 'user-id',
          name: 'Bob',
          avatar: null,
          joinedAt: new Date('2026-09-05T10:00:00Z'),
        },
      ]);
    });
  });
});
