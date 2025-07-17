import { controllers } from '@/controllers/map.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/task.schema';
import { Router } from 'express';

export const mapRoute = Router();

mapRoute.get('/tasks', controllers.getAllTasks);

mapRoute.post(
  '/tasks',
  validateBody(schemas.createTaskSchema),
  controllers.createTask
);

mapRoute.delete('/task/:id', validateIdParam, controllers.deleteTaskController);
