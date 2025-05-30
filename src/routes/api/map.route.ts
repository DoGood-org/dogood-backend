import {
  createEvent,
  deleteEventController,
  getAllEvents,
} from '@/controllers/map.controller';
import { validateBody, validateIdParam } from '@/middlewares';
import { schemas } from '@/schemas/event.schema';
import { Router } from 'express';

/**
 * @swagger
 * tags:
 *   name: Map
 *   description: Map API
 */

export const mapRoute = Router();

mapRoute.get('/events', getAllEvents);

mapRoute.post('/events', validateBody(schemas.createEventSchema), createEvent);

mapRoute.delete('/event/:id', validateIdParam, deleteEventController);
