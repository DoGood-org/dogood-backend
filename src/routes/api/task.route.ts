import { controllers } from '@/controllers/task.controller';
import {
  authenticateUser,
  authorizeTaskUpdate,
  validateBody,
  validateIdParam,
} from '@/middlewares';
import { authorizeTaskStatusChange } from '@/middlewares/authorizeTaskStatusChange.middleware';

import { schemas } from '@/schemas/task.schema';
import { Router } from 'express';

export const taskRoute = Router();

taskRoute.get('/', controllers.getAllTasks);

taskRoute.post(
  '/',
  authenticateUser,
  validateBody(schemas.createTaskSchema),
  controllers.createTask
);

taskRoute.delete(
  '/:id',
  authenticateUser,
  authorizeTaskUpdate,
  validateIdParam,
  controllers.deleteTaskController
);

taskRoute.post(
  '/search',
  validateBody(schemas.searchTasksSchema),
  controllers.searchTasksController
);

taskRoute.patch(
  '/:id',
  authenticateUser,
  authorizeTaskUpdate,
  validateIdParam,
  validateBody(schemas.updateTaskSchema),
  controllers.updateTaskController
);

taskRoute.patch(
  '/:id/status',
  authenticateUser,
  validateIdParam,
  authorizeTaskStatusChange,
  validateBody(schemas.updateTaskStatusSchema),
  controllers.updateTaskStatusController
);
