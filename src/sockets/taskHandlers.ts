import { validateSocketData } from '@/middlewares/validateSocketData';
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
  socket.on('createTask', async (taskData) => {
    logger.info(`🟡 [${socket.id}] Attempting to create task`, {
      taskData,
    });
    // Validate incoming task data
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

    try {
      const createdTask = await createTaskService(value);

      logger.info(`🟢 [${socket.id}] Task created successfully`, {
        createdTask,
      });

      socket.broadcast.emit('newTaskCreated', createdTask);

      socket.emit('createTaskSuccess', createdTask);
    } catch (err) {
      logger.error(`❌ [${socket.id}] Failed to create task`, {
        error: err,
      });
      socket.emit('createTaskError', {
        errors: ['Something went wrong while creating the task.'],
      });
    }
  });

  socket.on('updateTask', async (taskData) => {
    logger.info(`🔄 [${socket.id}] Attempting to update task`, { taskData });

    // Validate incoming task data
    const result = validateSocketData(
      schemas.updateTaskSchema,
      taskData,
      socket,
      'updateTaskError'
    );

    if (!result.success) return;

    try {
      const updatedTask = await updateTaskService(result.data);

      logger.info(`🟢 [${socket.id}] Task updated`, { updatedTask });

      socket.broadcast.emit('taskUpdated', updatedTask);

      socket.emit('updateTaskSuccess', updatedTask);
    } catch (error) {
      logger.error(`❌ [${socket.id}] Failed to update task`, { error });

      socket.emit('updateTaskError', {
        errors: ['Failed to update the task. Please try again.'],
      });
    }
  });

  socket.on('deleteTask', async (taskId: number) => {
    logger.info(`🗑️ [${socket.id}] Attempting to delete task`, { taskId });

    // Validate incoming task id
    const result = validateSocketData(
      schemas.deleteTaskSchema,
      taskId,
      socket,
      'deleteTaskError'
    );

    if (!result.success) return;

    try {
      await deleteTaskService(taskId);

      logger.info(`🟢 [${socket.id}] Task deleted successfully`, { taskId });

      socket.broadcast.emit('taskDeleted', taskId);

      socket.emit('deleteTaskSuccess', { id: taskId });
    } catch (error) {
      logger.error(`❌ [${socket.id}] Failed to delete task`, { error });

      socket.emit('deleteTaskError', {
        errors: ['Could not delete the task. It may not exist.'],
      });
    }
  });
}
