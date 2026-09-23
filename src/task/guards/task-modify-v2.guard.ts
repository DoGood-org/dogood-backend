import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { TaskModifyAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

@Injectable()
export class TaskModifyV2Guard implements CanActivate {
  constructor(private readonly taskAccessService: TaskAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    // NOTE: express types the route param as `string | string[]`; anything but a string is no task id.
    const taskId = typeof params.id === 'string' ? params.id : '';

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const access = await this.taskAccessService.checkTaskModifyAccess(
      user.userId,
      user.role,
      taskId,
    );

    switch (access) {
      case TaskModifyAccessResult.ALLOWED:
        return true;
      case TaskModifyAccessResult.TASK_NOT_FOUND:
        throw new NotFoundException('Task not found');
      case TaskModifyAccessResult.NOT_AUTHORIZED:
        throw new ForbiddenException(
          'You do not have permission to perform this action',
        );
    }
  }
}
