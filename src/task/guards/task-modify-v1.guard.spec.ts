import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { TaskModifyV1Guard } from 'src/task/guards/task-modify-v1.guard';
import { TaskModifyAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

describe('TaskModifyV1Guard', () => {
  const checkTaskModifyAccess = jest.fn();
  const taskAccessService = {
    checkTaskModifyAccess,
  } as unknown as TaskAccessService;
  const guard = new TaskModifyV1Guard(taskAccessService);
  const createContext = (user?: {
    userId: string;
    role: string;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { id: 'task-id' } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should let an allowed caller through', async () => {
    checkTaskModifyAccess.mockResolvedValue(TaskModifyAccessResult.ALLOWED);

    await expect(
      guard.canActivate(createContext({ userId: 'user-id', role: 'USER' })),
    ).resolves.toBe(true);
    expect(checkTaskModifyAccess).toHaveBeenCalledWith(
      'user-id',
      'USER',
      'task-id',
    );
  });

  it('should answer a missing task with the legacy envelope carrying a null code', async () => {
    checkTaskModifyAccess.mockResolvedValue(
      TaskModifyAccessResult.TASK_NOT_FOUND,
    );

    await expect(
      guard.canActivate(createContext({ userId: 'user-id', role: 'USER' })),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: {
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: null,
        message: 'Task not found',
      },
    });
  });

  it('should answer an unauthorized caller with the legacy envelope carrying a null code', async () => {
    checkTaskModifyAccess.mockResolvedValue(
      TaskModifyAccessResult.NOT_AUTHORIZED,
    );

    await expect(
      guard.canActivate(createContext({ userId: 'user-id', role: 'USER' })),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: {
        status: 'error',
        statusCode: HttpStatus.FORBIDDEN,
        code: null,
        message: 'You do not have permission to perform this action',
      },
    });
  });

  it('should answer a request without a user with 401 before reading the task', async () => {
    await expect(guard.canActivate(createContext())).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { code: null, message: 'Authentication required' },
    });
    expect(checkTaskModifyAccess).not.toHaveBeenCalled();
  });
});
