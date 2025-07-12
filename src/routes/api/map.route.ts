import { createTask, deleteTaskController, getAllTasks } from '@/controllers/map.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/task.schema';

import { Router } from 'express';

export const mapRoute = Router();

mapRoute.get('/tasks', getAllTasks);

mapRoute.post('/tasks', validateBody(schemas.createTaskSchema), createTask);

mapRoute.delete('/task/:id', validateIdParam, deleteTaskController);
