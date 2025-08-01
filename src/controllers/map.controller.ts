import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  createTaskService,
  deleteTaskService,
  getAllTasksService,
  getTaskByIdService,
  isTaskExists,
} from '@/services/task.service';
import { asyncHandler } from '@/decorators/asyncHandler';

const createTask = async (req: Request, res: Response, next: NextFunction) => {
  const exists = await isTaskExists(req.body);
  if (exists) {
    logger.error('❌ Task with these parameters already exists');
    return next(httpError(409, 'Task with these parameters already exists'));
  }
  const task = await createTaskService(req.body);

  logger.info('✅ Task created successfully', {
    taskId: task.id,
    hostId: task.hostId,
    title: task.title,
  });

  res.status(201).json({ message: 'Task created successfully', data: task });
};

const getAllTasks = async (req: Request, res: Response) => {
  const tasks = await getAllTasksService();

  logger.info('✅ Fetched all tasks successfully');

  res.status(200).json({
    message: 'Fetched all tasks successfully',
    data: tasks,
  });
};

const deleteTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const taskId = Number(req.params.id);

  const existingTask = await getTaskByIdService(taskId);

  if (!existingTask) {
    logger.error(`❌ Task with id ${taskId} not found`);
    return next(httpError(404, `Task with id ${taskId} not found`));
  }

  const deletedTask = await deleteTaskService(taskId);

  logger.info(`✅ Task with id ${taskId} deleted successfully`);

  res.status(200).json({
    message: 'Task deleted successfully',
    data: deletedTask,
  });
};

export const controllers = {
  getAllTasks: asyncHandler(getAllTasks),
  createTask: asyncHandler(createTask),
  deleteTaskController: asyncHandler(deleteTaskController),
};
