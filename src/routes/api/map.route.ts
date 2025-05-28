import { createEvent, getAllEvents } from '@/controllers/mapControllers';
import { validateBody } from '@/middlewares';
import { schemas } from '@/schemas/event.schemas';
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
