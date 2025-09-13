import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import {
  changeTaskStatusService,
  createTaskService,
  deleteTaskService,
  getAllTasksService,
  getTaskByIdService,
  isTaskExists,
  searchTasks,
  updateTaskService,
} from '@/services/task.service';
import { asyncHandler } from '@/decorators/asyncHandler';

const createTask = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    logger.error('❌ User not authenticated');
    return next(httpError(401, 'User not authenticated'));
  }
  const exists = await isTaskExists(req.body);
  if (exists) {
    logger.error('❌ Task with these parameters already exists');
    return next(httpError(409, 'Task with these parameters already exists'));
  }

  const task = await createTaskService(req.body, user.id);

  res.status(201).json({ message: 'Task created successfully', data: task });
};

const getAllTasks = async (req: Request, res: Response) => {
  const tasks = await getAllTasksService();

  res.status(200).json({
    message: 'Fetched all tasks successfully',
    data: tasks,
  });
};

const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  const taskId = Number(req.params.id);

  const task = await getTaskByIdService(taskId);

  if (!task) {
    logger.error(`❌ Task with id ${taskId} not found`);
    return next(httpError(404, `Task with id ${taskId} not found`));
  }

  res.status(200).json({
    message: 'Task fetched successfully',
    data: task,
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

  await deleteTaskService(taskId);

  res.status(200).json({
    message: 'Task deleted successfully',
  });
};

const searchTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tasks = await searchTasks(req.body);

  if (tasks.length === 0) {
    logger.info('ℹ️ No tasks found matching the search criteria', {
      body: req.body,
    });
    return next(httpError(404, 'No tasks found matching the search criteria'));
  }

  res.status(200).json({
    message: 'Tasks fetched successfully',
    data: tasks,
  });
};

const updateTaskController = async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);

  const updatedTask = await updateTaskService(req.body, taskId);

  res.status(200).json({
    message: 'Task updated successfully',
    data: updatedTask,
  });
};

const updateTaskStatusController = async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;

  const updatedTask = await changeTaskStatusService(taskId, status);

  res.status(200).json({
    message: 'Task status updated successfully',
    data: updatedTask,
  });
};

export const controllers = {
  getAllTasks: asyncHandler(getAllTasks),
  getTaskById: asyncHandler(getTaskById),
  createTask: asyncHandler(createTask),
  deleteTaskController: asyncHandler(deleteTaskController),
  searchTasksController: asyncHandler(searchTasksController),
  updateTaskController: asyncHandler(updateTaskController),
  updateTaskStatusController: asyncHandler(updateTaskStatusController),
};
