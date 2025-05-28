import { Request, Response, NextFunction } from 'express';
import {
  createEventService,
  getAllEventsService,
} from '@/services/event.service';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';

export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const event = await createEventService(req.body);
    res.status(201).json(event);
  } catch (error) {
    logger.error('Failed to create event in controller', { error });
    next(httpError(500, 'Failed to create event'));
  }
};

export const getAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const events = await getAllEventsService();

    logger.info(`✅ Fetched all events, count: ${events.length}`);

    res.status(200).json(events);
  } catch (error) {
    logger.error('❌ Failed to fetch events', { error });
    next(httpError(500, 'Failed to fetch events'));
  }
};
