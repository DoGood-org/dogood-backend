import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { TaskStatusAccessResult } from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

// NOTE: legacy authorizeTaskStatusChange replied straight from the middleware with a bare
// `{ message }` body — no status/code envelope, unlike the rest of v1.
const legacyError = (statusCode: HttpStatus, message: string): V1ApiException =>
  new V1ApiException(statusCode, message, ErrorCode.TASK_NOT_FOUND, {
    message,
  });

@Injectable()
export class TaskStatusV1Guard implements CanActivate {
  constructor(private readonly taskAccessService: TaskAccessService) {}

  // NOTE: the guard runs before the validation pipe, so an invalid status sent by a user who is not
  // the host is answered with 403, not 400 — exactly as in the legacy middleware order.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    // NOTE: express types the route param as `string | string[]`; anything but a string is no task id.
    const taskId = typeof params.id === 'string' ? params.id : '';
    const body: unknown = request.body;

    if (!user) {
      throw legacyError(HttpStatus.UNAUTHORIZED, 'Authentication required');
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
        throw legacyError(HttpStatus.NOT_FOUND, 'Task not found');
      case TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN:
        throw legacyError(
          HttpStatus.FORBIDDEN,
          'Host user can only close or complete the task',
        );
      case TaskStatusAccessResult.ORGANIZATION_STATUS_FORBIDDEN:
        throw legacyError(
          HttpStatus.FORBIDDEN,
          'Organization admins/managers can only close or complete tasks',
        );
      case TaskStatusAccessResult.NOT_AUTHORIZED:
        throw legacyError(
          HttpStatus.FORBIDDEN,
          'Not authorized to change task status',
        );
    }
  }
}
