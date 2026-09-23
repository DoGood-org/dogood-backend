import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TaskStatusV1Guard } from 'src/task/guards/task-status-v1.guard';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskStatusAccessResult } from 'src/task/interfaces/task';

describe('TaskStatusV1Guard', () => {
  const checkTaskStatusAccess = jest.fn();
  const taskAccessService = {
    checkTaskStatusAccess,
  } as unknown as TaskAccessService;
  const guard = new TaskStatusV1Guard(taskAccessService);
  const createContext = (body: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'user-id', role: 'USER' },
          params: { id: 'task-id' },
          body,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should pass the raw status through before the validation pipe runs', async () => {
    checkTaskStatusAccess.mockResolvedValue(TaskStatusAccessResult.ALLOWED);

    await expect(
      guard.canActivate(createContext({ status: 'NONSENSE' })),
    ).resolves.toBe(true);
    expect(checkTaskStatusAccess).toHaveBeenCalledWith(
      'user-id',
      'USER',
      'task-id',
      'NONSENSE',
    );
  });

  it('should answer a forbidden status with the bare legacy message body', async () => {
    checkTaskStatusAccess.mockResolvedValue(
      TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN,
    );

    await expect(
      guard.canActivate(createContext({ status: TaskStatus.IN_PROGRESS })),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { message: 'Host user can only close or complete the task' },
    });
  });

  it('should answer a missing task with the bare legacy message body', async () => {
    checkTaskStatusAccess.mockResolvedValue(
      TaskStatusAccessResult.TASK_NOT_FOUND,
    );

    await expect(
      guard.canActivate(createContext({ status: TaskStatus.CLOSED })),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: { message: 'Task not found' },
    });
  });

  it('should treat a body without a status as an unset status', async () => {
    checkTaskStatusAccess.mockResolvedValue(
      TaskStatusAccessResult.NOT_AUTHORIZED,
    );

    await expect(guard.canActivate(createContext(undefined))).rejects.toThrow();
    expect(checkTaskStatusAccess).toHaveBeenCalledWith(
      'user-id',
      'USER',
      'task-id',
      undefined,
    );
  });
});
