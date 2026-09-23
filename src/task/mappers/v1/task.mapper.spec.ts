import { CategoryType, HostType, TaskStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { TaskRowV1 } from 'src/task/interfaces/task';
import { TaskMapperV1 } from 'src/task/mappers/v1/task.mapper';

describe('TaskMapperV1', () => {
  const createdAt = new Date('2026-09-01T10:00:00Z');
  const userHostedRow: TaskRowV1 = {
    id: 'task-id',
    title: 'Clean park',
    description: 'Bring gloves',
    imageUrl: 'https://cdn.test/picture.png',
    startDate: new Date('2026-10-01T09:00:00Z'),
    endDate: null,
    status: TaskStatus.PENDING,
    categories: [CategoryType.NATURE],
    amount: null,
    currentAmount: null,
    currency: null,
    requirements: null,
    taskLocation: { name: 'Central park', latitude: 50.45, longitude: 30.52 },
    host: {
      type: HostType.USER,
      user: {
        id: 'user-id',
        name: 'Ann',
        createdAt,
        updatedAt: createdAt,
        userProfile: { avatar: 'https://cdn.test/avatar.png' },
      },
      organization: null,
    },
    participants: [{ user: { id: 'participant-id', name: 'Bob' } }],
  };
  const mapper = new TaskMapperV1();

  describe('toTask', () => {
    it('should map the legacy field names and keep startTime out of the response', () => {
      const task = mapper.toTask(userHostedRow);

      expect(task.picture).toBe('https://cdn.test/picture.png');
      expect(task.location).toEqual({ lat: 50.45, lng: 30.52 });
      expect(task.locationName).toBe('Central park');
      expect(task.host.user?.avatar).toBe('https://cdn.test/avatar.png');
      expect(task.joinedUsers).toEqual([{ id: 'participant-id', name: 'Bob' }]);
      expect(task).not.toHaveProperty('startTime');
    });

    it('should return a null location when the task has no coordinates', () => {
      const task = mapper.toTask({
        ...userHostedRow,
        taskLocation: { name: 'Central park', latitude: null, longitude: null },
      });

      expect(task.location).toBeNull();
      expect(task.locationName).toBe('Central park');
    });

    it('should return a null location and locationName when there is no task location row', () => {
      const task = mapper.toTask({ ...userHostedRow, taskLocation: null });

      expect(task.location).toBeNull();
      expect(task.locationName).toBeNull();
    });

    it('should expose the organization avatarUrl under the legacy avatar key', () => {
      const task = mapper.toTask({
        ...userHostedRow,
        host: {
          type: HostType.ORGANIZATION,
          user: null,
          organization: {
            id: 'organization-id',
            name: 'Green city',
            avatarUrl: 'https://cdn.test/org.png',
            createdAt,
          },
        },
      });

      expect(task.host.user).toBeNull();
      expect(task.host.organization).toEqual({
        id: 'organization-id',
        name: 'Green city',
        avatar: 'https://cdn.test/org.png',
        createdAt,
      });
    });

    it('should map a task without participants to an empty joinedUsers array', () => {
      const task = mapper.toTask({ ...userHostedRow, participants: [] });

      expect(task.joinedUsers).toEqual([]);
    });
  });

  describe('response envelopes', () => {
    it('should wrap a single task into the legacy envelope', () => {
      expect(
        mapper.toTaskResponse(userHostedRow, SuccessCode.TASK_RETRIEVED),
      ).toEqual({
        status: 'success',
        code: SuccessCode.TASK_RETRIEVED,
        data: { task: mapper.toTask(userHostedRow) },
      });
    });

    it('should wrap a task list into the legacy envelope', () => {
      expect(
        mapper.toTasksResponse([userHostedRow], SuccessCode.TASKS_RETRIEVED),
      ).toEqual({
        status: 'success',
        code: SuccessCode.TASKS_RETRIEVED,
        data: { tasks: [mapper.toTask(userHostedRow)] },
      });
    });

    it('should answer a delete without a data key', () => {
      const response = mapper.toTaskDeletedResponse(SuccessCode.TASK_DELETED);

      expect(response).toEqual({
        status: 'success',
        code: SuccessCode.TASK_DELETED,
      });
      expect(response).not.toHaveProperty('data');
    });
  });
});
