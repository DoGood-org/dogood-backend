import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { TaskModifyAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

// NOTE: legacy authorizeTaskUpdate answered through httpError without a machine-readable code,
// so every body here carries `code: null` instead of the default V1ApiException envelope.
const legacyError = (statusCode: HttpStatus, message: string): V1ApiException =>
  new V1ApiException(statusCode, message, ErrorCode.TASK_NOT_FOUND, {
    status: 'error',
    statusCode,
    code: null,
    message,
  });

@Injectable()
export class TaskModifyV1Guard implements CanActivate {
  constructor(private readonly taskAccessService: TaskAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    // NOTE: express types the route param as `string | string[]`; anything but a string is no task id.
    const taskId = typeof params.id === 'string' ? params.id : '';

    if (!user) {
      throw legacyError(HttpStatus.UNAUTHORIZED, 'Authentication required');
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
        throw legacyError(HttpStatus.NOT_FOUND, 'Task not found');
      case TaskModifyAccessResult.NOT_AUTHORIZED:
        throw legacyError(
          HttpStatus.FORBIDDEN,
          'You do not have permission to perform this action',
        );
    }
  }
}
