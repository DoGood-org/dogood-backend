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
    return next(httpError(409, 'Task with these parameters already exists'));
  }
  const event = await createTaskService(req.body);

  logger.info('✅ Event created successfully', {
    eventId: event.id,
    hostId: event.hostId,
    title: event.title,
  });

  res.status(201).json(event);
};

const getAllTasks = async (req: Request, res: Response) => {
  const events = await getAllTasksService();

  logger.info(`✅ Fetched all events, count: ${events.length}`);

  res.status(200).json(events);
};

const deleteTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const eventId = Number(req.params.id);

  const existingEvent = await getTaskByIdService(eventId);

  if (!existingEvent) {
    return next(httpError(404, `Event with id ${eventId} not found`));
  }

  const deletedEvent = await deleteTaskService(eventId);

  logger.info(`✅ event with id ${eventId} deleted successfully`);

  res.status(200).json({
    message: 'Event deleted successfully',
    event: deletedEvent,
  });
};
export const controllers = {
  getAllTasks: asyncHandler(getAllTasks),
  createTask: asyncHandler(createTask),
  deleteTaskController: asyncHandler(deleteTaskController),
};
