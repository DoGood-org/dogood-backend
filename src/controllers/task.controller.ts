import { Request, Response, NextFunction } from 'express';
import { httpError } from '@/helpers/httpError';
import { asyncHandler } from '@/decorators/asyncHandler';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { taskServices } from '@/services/task.service';


const createTask = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return next(
      httpError(401, 'User not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const exists = await taskServices.isTaskExists(req.body);
  if (exists) {
    return next(
      httpError(
        409,
        'Task with these parameters already exists',
        ErrorCode.TASK_ALREADY_EXISTS
      )
    );
  }

  const task = await taskServices.createTask(req.body, user.id);

  res.status(201).json({
    status: 'success',
    code: SuccessCode.TASK_CREATED,
    data: { task },
  });
};


const getAllTasks = async (_req: Request, res: Response) => {
  const tasks = await taskServices.getAllTasks();

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASKS_RETRIEVED,
    data: { tasks },
  });
};

const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  // const taskId = Number(req.params.id);
  const taskId = req.params.id;

  const task = await taskServices.getTaskById(taskId);

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


const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const taskId = req.params.id;

  const existingTask = await taskServices.getTaskById(taskId);

  if (!existingTask) {
    return next(
      httpError(404, 'Task not found', ErrorCode.TASK_NOT_FOUND)
    );
  }

  await taskServices.deleteTask(taskId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_DELETED,
  });
};

const searchTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tasks = await taskServices.searchTasks(req.body);

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


const updateTask = async (req: Request, res: Response) => {
  const taskId = req.params.id;

  const updatedTask = await taskServices.updateTask(req.body, taskId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.TASK_UPDATED,
    data: { task: updatedTask },
  });
};

const updateTaskStatus = async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const { status } = req.body;

  const updatedTask = await taskServices.changeTaskStatus(taskId, status);

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
  deleteTask: asyncHandler(deleteTask),
  searchTasks: asyncHandler(searchTasks),
  updateTask: asyncHandler(updateTask),
  updateTaskStatus: asyncHandler(updateTaskStatus),
};
