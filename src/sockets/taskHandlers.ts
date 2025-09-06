import { socketAsyncHandler } from '@/decorators/socketAsyncHandler';
import { validateSocketData } from '@/middlewares/validateSocketData.middleware';
import { schemas } from '@/schemas/task.schema';
import {
  createTaskService,
  deleteTaskService,
  isTaskExists,
  updateTaskService,
} from '@/services/task.service';
import logger from '@/utils/logger';
import { Socket } from 'socket.io';


export default function taskHandlers(socket: Socket) {
  socket.on(
    'createTask',
    socketAsyncHandler(
      async (socket: Socket, taskData: Record<string, any>) => {
        logger.info(`🟡 [${socket.id}] Attempting to create task`, {
          taskData,
        });

        const result = validateSocketData(
          schemas.createTaskSchema,
          taskData,
          socket,
          'createTaskError'
        );

        if (!result.success) return;

        logger.info(`🟢 [${socket.id}] Task data validated successfully`, {
          taskData: result.data,
        });

        const value = result.data;

        const exists = await isTaskExists(value);
        if (exists) {
          logger.warn(`🔶 [${socket.id}] Duplicate task`, { taskData });
          socket.emit('createTaskError', {
            errors: [
              'Task with the same title and time or location already exists for this host.',
            ],
          });
          return;
        }

        const createdTask = await createTaskService(value);

        logger.info(`🟢 [${socket.id}] Task created successfully`, {
          createdTask,
        });

        socket.broadcast.emit('newTaskCreated', createdTask);

        socket.emit('createTaskSuccess', createdTask);
      },
      {
        errorEvent: 'createTaskError',
        errorMessage: 'Failed to create the task.',
      }
    )
  );

  socket.on(
    'updateTask',
    socketAsyncHandler(
      async (socket: Socket, taskData: Record<string, any>) => {
        logger.info(`🔄 [${socket.id}] Attempting to update task`, {
          taskData,
        });

        const result = validateSocketData(
          schemas.updateTaskSchema,
          taskData,
          socket,
          'updateTaskError'
        );

        if (!result.success) return;

        const updatedTask = await updateTaskService(result.data);

        logger.info(`🟢 [${socket.id}] Task updated`, { updatedTask });

        socket.broadcast.emit('taskUpdated', updatedTask);

        socket.emit('updateTaskSuccess', updatedTask);
      },
      {
        errorEvent: 'updateTaskError',
        errorMessage: 'Failed to update the task.',
      }
    )
  );

  socket.on(
    'deleteTask',
    socketAsyncHandler(
      async (socket: Socket, taskId: number) => {
        logger.info(`🗑️ [${socket.id}] Attempting to delete task`, { taskId });

        const result = validateSocketData(
          schemas.deleteTaskSchema,
          taskId,
          socket,
          'deleteTaskError'
        );

        if (!result.success) return;

        await deleteTaskService(taskId);

        logger.info(`🟢 [${socket.id}] Task deleted successfully`, { taskId });

        socket.broadcast.emit('taskDeleted', taskId);

        socket.emit('deleteTaskSuccess', { id: taskId });
      },
      {
        errorEvent: 'deleteTaskError',
        errorMessage: 'Failed to delete the task.',
      }
    )
  );
}
