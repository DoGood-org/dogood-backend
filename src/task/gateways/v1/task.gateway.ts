import { HttpStatus, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Public } from '@shared/decorators/public.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';
import { RealtimeSocketV1 } from 'src/realtime/interfaces/realtime';
import { CreateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/create-task-request.dto';
import { UpdateTaskRequestDtoV1 } from 'src/task/dtos/requests/v1/update-task-request.dto';
import {
  TaskModifyAccessResult,
  UpdateTaskSocketPayloadV1,
} from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';

const CREATE_TASK_FAILED = 'Failed to create the task.';
const UPDATE_TASK_FAILED = 'Failed to update the task.';
const DELETE_TASK_FAILED = 'Failed to delete the task.';

// NOTE: legacy let guests and anyone else create, update and delete tasks over the socket; guests now get
// `auth:error`, and update/delete need the same host / org manager / site admin access as REST.
@Public()
@WebSocketGateway()
export class TaskGatewayV1 {
  private readonly logger = new Logger(TaskGatewayV1.name);

  constructor(
    private readonly taskService: TaskServiceV1,
    private readonly taskAccessService: TaskAccessService,
    private readonly realtimeGateway: RealtimeGatewayV1,
  ) {}

  @SubscribeMessage('createTask')
  async createTask(
    @ConnectedSocket() client: RealtimeSocketV1,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = this.realtimeGateway.getAuthorizedUserId(
      client,
      'createTask',
    );

    if (!userId) {
      return;
    }

    const parsed = CreateTaskRequestDtoV1.schema.safeParse(payload);

    if (!parsed.success) {
      client.emit('createTaskError', {
        errors: parsed.error.issues.map((issue) => issue.message),
      });

      return;
    }

    try {
      const { data } = await this.taskService.createTask(parsed.data, userId);

      client.broadcast.emit('newTaskCreated', data.task);
      client.emit('createTaskSuccess', data.task);
    } catch (error) {
      // NOTE: the duplicate check is the only 409 `createTask` throws.
      if (
        error instanceof V1ApiException &&
        error.getStatus() === Number(HttpStatus.CONFLICT)
      ) {
        client.emit('createTaskError', {
          errors: [
            'Task with the same title and time or location already exists for this host.',
          ],
        });

        return;
      }

      this.logger.error(error);
      client.emit('createTaskError', { errors: [CREATE_TASK_FAILED] });
    }
  }

  @SubscribeMessage('updateTask')
  async updateTask(
    @ConnectedSocket() client: RealtimeSocketV1,
    @MessageBody() payload: UpdateTaskSocketPayloadV1,
  ): Promise<void> {
    if (!this.realtimeGateway.getAuthorizedUserId(client, 'updateTask')) {
      return;
    }

    try {
      const { taskId, update } = payload;
      const parsed = UpdateTaskRequestDtoV1.schema.safeParse(update);

      if (!parsed.success) {
        client.emit('updateTaskError', {
          errors: parsed.error.issues.map((issue) => issue.message),
        });

        return;
      }

      if (!(await this.canModifyTask(client, taskId))) {
        client.emit('updateTaskError', { errors: [UPDATE_TASK_FAILED] });

        return;
      }

      const { data } = await this.taskService.updateTask(taskId, parsed.data);

      client.broadcast.emit('taskUpdated', data.task);
      client.emit('updateTaskSuccess', data.task);
    } catch (error) {
      this.logger.error(error);
      client.emit('updateTaskError', { errors: [UPDATE_TASK_FAILED] });
    }
  }

  @SubscribeMessage('deleteTask')
  async deleteTask(
    @ConnectedSocket() client: RealtimeSocketV1,
    @MessageBody() taskId: string,
  ): Promise<void> {
    if (!this.realtimeGateway.getAuthorizedUserId(client, 'deleteTask')) {
      return;
    }

    try {
      if (!(await this.canModifyTask(client, taskId))) {
        client.emit('deleteTaskError', { errors: [DELETE_TASK_FAILED] });

        return;
      }

      await this.taskService.deleteTask(taskId);

      client.broadcast.emit('taskDeleted', taskId);
      client.emit('deleteTaskSuccess', { id: taskId });
    } catch (error) {
      this.logger.error(error);
      client.emit('deleteTaskError', { errors: [DELETE_TASK_FAILED] });
    }
  }

  private async canModifyTask(
    client: RealtimeSocketV1,
    taskId: string,
  ): Promise<boolean> {
    const { userId, role } = client.data;

    if (!userId || !role) {
      return false;
    }

    const access = await this.taskAccessService.checkTaskModifyAccess(
      userId,
      role,
      taskId,
    );

    return access === TaskModifyAccessResult.ALLOWED;
  }
}
