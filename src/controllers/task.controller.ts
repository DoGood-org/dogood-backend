import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
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
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';


const createTask = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return next(
      httpError(401, 'User not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const exists = await isTaskExists(req.body);
  if (exists) {
    return next(
      httpError(
        409,
        'Task with these parameters already exists',
        ErrorCode.TASK_ALREADY_EXISTS
      )
    );
  }

  const task = await createTaskService(req.body, user.id);

  res.status(201).json({
    status: 'success',
    code: SuccessCode.TASK_CREATED,
    data: { task },
  });
};


const getAllTasks = async (_req: Request, res: Response) => {
  const tasks = await getAllTasksService();

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASKS_RETRIEVED,
    data: { tasks },
  });
};

const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  const taskId = Number(req.params.id);

  const task = await getTaskByIdService(taskId);

  if (!task) {
    return next(
      httpError(404, 'Task not found', ErrorCode.TASK_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_RETRIEVED,
    data: { task },
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
    return next(
      httpError(404, 'Task not found', ErrorCode.TASK_NOT_FOUND)
    );
  }

  await deleteTaskService(taskId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_DELETED,
  });
};

const searchTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tasks = await searchTasks(req.body);

  if (tasks.length === 0) {
    return next(
      httpError(
        404,
        'No tasks found matching the search criteria',
        ErrorCode.TASK_SEARCH_EMPTY
      )
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASKS_SEARCHED,
    data: { tasks },
  });
};


const updateTaskController = async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);

  const updatedTask = await updateTaskService(req.body, taskId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_UPDATED,
    data: { task: updatedTask },
  });
};

const updateTaskStatusController = async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);
  const { status } = req.body;

  const updatedTask = await changeTaskStatusService(taskId, status);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_STATUS_UPDATED,
    data: { task: updatedTask },
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
