import { Request, Response, NextFunction } from 'express';
import {
  createEventService,
  deleteEventService,
  getAllEventsService,
  getEventByIdService,
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
    // ! додати перевірку на дублікат

    logger.info('✅ Event created successfully', {
      eventId: event.id,
      hostId: event.hostId,
      title: event.title,
    });

    res.status(201).json(event);
  } catch (error) {
    logger.error('❌ Failed to create event in controller', { error });
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

export const deleteEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const eventId = Number(req.params.id);

  try {
    const existingEvent = await getEventByIdService(eventId);

    if (!existingEvent) {
      return next(httpError(404, `Event with id ${eventId} not found`));
    }

    const deletedEvent = await deleteEventService(eventId);

    logger.info(`✅ event with id ${eventId} deleted successfully`);

    res.status(200).json({
      message: 'Event deleted successfully',
      event: deletedEvent,
    });
  } catch (error) {
    logger.error('❌ Failed to delete event', { error });
    next(httpError(500, 'Failed to delete event'));
  }
};
