import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { TaskStatusAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

@Injectable()
export class TaskStatusV2Guard implements CanActivate {
  constructor(private readonly taskAccessService: TaskAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    // NOTE: express types the route param as `string | string[]`; anything but a string is no task id.
    const taskId = typeof params.id === 'string' ? params.id : '';
    const body: unknown = request.body;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const status =
      typeof body === 'object' && body !== null && 'status' in body
        ? body.status
        : undefined;
    const access = await this.taskAccessService.checkTaskStatusAccess(
      user.userId,
      user.role,
      taskId,
      status,
    );

    switch (access) {
      case TaskStatusAccessResult.ALLOWED:
        return true;
      case TaskStatusAccessResult.TASK_NOT_FOUND:
        throw new NotFoundException('Task not found');
      case TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN:
      case TaskStatusAccessResult.ORGANIZATION_STATUS_FORBIDDEN:
        throw new ForbiddenException(
          'A task host can only close or complete the task',
        );
      case TaskStatusAccessResult.NOT_AUTHORIZED:
        throw new ForbiddenException('Not authorized to change task status');
    }
  }
}
