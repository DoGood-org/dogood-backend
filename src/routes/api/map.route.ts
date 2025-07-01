import { createTask, deleteTaskController, getAllTasks } from '@/controllers/map.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/task.schema';

import { Router } from 'express';

/**
 * @swagger
 * tags:
 *   name: Map
 *   description: Map API
 */

export const mapRoute = Router();

mapRoute.get('/tasks', getAllTasks);

mapRoute.post('/task', validateBody(schemas.createTaskSchema), createTask);

mapRoute.delete('/task/:id', validateIdParam, deleteTaskController);
