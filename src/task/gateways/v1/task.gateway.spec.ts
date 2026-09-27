import { HttpStatus } from '@nestjs/common';
import { CategoryType, SiteRole } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { TokensService } from '@shared/services/tokens.service';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';
import { RealtimeSocketV1 } from 'src/realtime/interfaces/realtime';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';
import { TaskGatewayV1 } from 'src/task/gateways/v1/task.gateway';
import { TaskModifyAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the realtime gateway is never asked to verify here.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('TaskGatewayV1', () => {
  const taskService = {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  };
  const taskAccessService = { checkTaskModifyAccess: jest.fn() };
  const task = { id: 'task-1', title: 'Clean park' };
  const clientEmit = jest.fn();
  const broadcastEmit = jest.fn();
  let gateway: TaskGatewayV1;

  const createClient = (userId?: string, role?: SiteRole): RealtimeSocketV1 =>
    ({
      id: 'socket-1',
      data: userId ? { userId, role, sessionId: 'session-1' } : {},
      emit: clientEmit,
      broadcast: { emit: broadcastEmit },
    }) as unknown as RealtimeSocketV1;

  const createPayload = {
    title: 'Clean park',
    description: 'Bring gloves',
    isOrganization: false,
    startDate: '2026-10-01T10:00:00.000Z',
    startTime: '2026-10-01T10:00:00.000Z',
    categories: [CategoryType.NATURE],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new TaskGatewayV1(
      taskService as unknown as TaskServiceV1,
      taskAccessService as unknown as TaskAccessService,
      new RealtimeGatewayV1(
        {} as TokensService,
        {
          isSocketSessionActive: jest.fn().mockResolvedValue(true),
        } as unknown as RealtimeServiceV1,
      ),
    );
    jest.spyOn(gateway['logger'], 'error').mockImplementation(() => undefined);
  });

  describe('createTask', () => {
    it('should broadcast newTaskCreated and ack the created task', async () => {
      taskService.createTask.mockResolvedValue({ data: { task } });

      await gateway.createTask(
        createClient('user-1', SiteRole.USER),
        createPayload,
      );

      expect(taskService.createTask).toHaveBeenCalledWith(
        createPayload,
        'user-1',
      );
      expect(broadcastEmit).toHaveBeenCalledWith('newTaskCreated', task);
      expect(clientEmit).toHaveBeenCalledWith('createTaskSuccess', task);
    });

    it('should answer a guest with auth:error and create nothing', async () => {
      await gateway.createTask(createClient(), createPayload);

      expect(clientEmit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for createTask',
      });
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should emit the zod messages of an invalid payload', async () => {
      await gateway.createTask(createClient('user-1', SiteRole.USER), {
        ...createPayload,
        title: '',
        categories: [],
      });

      expect(clientEmit).toHaveBeenCalledWith('createTaskError', {
        errors: ['Title is required', 'At least one category is required'],
      });
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should emit the legacy duplicate text on a 409', async () => {
      taskService.createTask.mockRejectedValue(
        new V1ApiException(
          HttpStatus.CONFLICT,
          'Task with these parameters already exists',
          ErrorCode.TASK_ALREADY_EXISTS,
        ),
      );

      await gateway.createTask(
        createClient('user-1', SiteRole.USER),
        createPayload,
      );

      expect(clientEmit).toHaveBeenCalledWith('createTaskError', {
        errors: [
          'Task with the same title and time or location already exists for this host.',
        ],
      });
      expect(broadcastEmit).not.toHaveBeenCalled();
    });

    it('should hide any other error behind the legacy failure text', async () => {
      taskService.createTask.mockRejectedValue(
        new V1ApiException(
          HttpStatus.FORBIDDEN,
          'You do not have permission to perform this action',
          ErrorCode.TASK_NOT_FOUND,
        ),
      );

      await gateway.createTask(
        createClient('user-1', SiteRole.USER),
        createPayload,
      );

      expect(clientEmit).toHaveBeenCalledWith('createTaskError', {
        errors: ['Failed to create the task.'],
      });
    });
  });

  describe('updateTask', () => {
    const payload = { taskId: 'task-1', update: { title: 'New title' } };

    it('should check access, broadcast taskUpdated and ack the updated task', async () => {
      taskAccessService.checkTaskModifyAccess.mockResolvedValue(
        TaskModifyAccessResult.ALLOWED,
      );
      taskService.updateTask.mockResolvedValue({ data: { task } });

      await gateway.updateTask(createClient('user-1', SiteRole.USER), payload);

      expect(taskAccessService.checkTaskModifyAccess).toHaveBeenCalledWith(
        'user-1',
        SiteRole.USER,
        'task-1',
      );
      expect(taskService.updateTask).toHaveBeenCalledWith('task-1', {
        title: 'New title',
      });
      expect(broadcastEmit).toHaveBeenCalledWith('taskUpdated', task);
      expect(clientEmit).toHaveBeenCalledWith('updateTaskSuccess', task);
    });

    it.each([
      TaskModifyAccessResult.NOT_AUTHORIZED,
      TaskModifyAccessResult.TASK_NOT_FOUND,
    ])('should refuse %s without updating or broadcasting', async (access) => {
      taskAccessService.checkTaskModifyAccess.mockResolvedValue(access);

      await gateway.updateTask(createClient('user-2', SiteRole.USER), payload);

      expect(clientEmit).toHaveBeenCalledWith('updateTaskError', {
        errors: ['Failed to update the task.'],
      });
      expect(taskService.updateTask).not.toHaveBeenCalled();
      expect(broadcastEmit).not.toHaveBeenCalled();
    });

    it('should emit the zod messages of an invalid update', async () => {
      await gateway.updateTask(createClient('user-1', SiteRole.USER), {
        taskId: 'task-1',
        update: { amount: 'many' },
      });

      expect(clientEmit).toHaveBeenCalledWith('updateTaskError', {
        errors: [expect.any(String)],
      });
      expect(taskAccessService.checkTaskModifyAccess).not.toHaveBeenCalled();
    });

    it('should answer a guest with auth:error', async () => {
      await gateway.updateTask(createClient(), payload);

      expect(clientEmit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for updateTask',
      });
      expect(taskAccessService.checkTaskModifyAccess).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should broadcast taskDeleted and ack the id', async () => {
      taskAccessService.checkTaskModifyAccess.mockResolvedValue(
        TaskModifyAccessResult.ALLOWED,
      );
      taskService.deleteTask.mockResolvedValue(undefined);

      await gateway.deleteTask(
        createClient('admin-1', SiteRole.ADMIN),
        'task-1',
      );

      expect(taskService.deleteTask).toHaveBeenCalledWith('task-1');
      expect(broadcastEmit).toHaveBeenCalledWith('taskDeleted', 'task-1');
      expect(clientEmit).toHaveBeenCalledWith('deleteTaskSuccess', {
        id: 'task-1',
      });
    });

    it('should refuse a foreign task without deleting or broadcasting', async () => {
      taskAccessService.checkTaskModifyAccess.mockResolvedValue(
        TaskModifyAccessResult.NOT_AUTHORIZED,
      );

      await gateway.deleteTask(createClient('user-2', SiteRole.USER), 'task-1');

      expect(clientEmit).toHaveBeenCalledWith('deleteTaskError', {
        errors: ['Failed to delete the task.'],
      });
      expect(taskService.deleteTask).not.toHaveBeenCalled();
      expect(broadcastEmit).not.toHaveBeenCalled();
    });

    it('should hide a failed delete behind the legacy failure text', async () => {
      taskAccessService.checkTaskModifyAccess.mockResolvedValue(
        TaskModifyAccessResult.ALLOWED,
      );
      taskService.deleteTask.mockRejectedValue(new Error('db down'));

      await gateway.deleteTask(
        createClient('admin-1', SiteRole.ADMIN),
        'task-1',
      );

      expect(clientEmit).toHaveBeenCalledWith('deleteTaskError', {
        errors: ['Failed to delete the task.'],
      });
      expect(broadcastEmit).not.toHaveBeenCalled();
    });

    it('should answer a guest with auth:error', async () => {
      await gateway.deleteTask(createClient(), 'task-1');

      expect(clientEmit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for deleteTask',
      });
      expect(taskService.deleteTask).not.toHaveBeenCalled();
    });
  });
});
