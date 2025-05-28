import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';

interface Location {
  type: 'Point';
  coordinates: [number, number];
}

interface CreateEventInput {
  title: string;
  description: string;
  hostId: number;
  category: number;
  startTime: string | Date;
  endTime: string | Date;
  location: Location;
}

export const createEventService = async (data: CreateEventInput) => {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      category: data.category,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      location: {
        type: 'Point',
        coordinates: data.location.coordinates,
      } as any,
    },
  });

  logger.info('✅ Event created successfully', {
    eventId: event.id,
    hostId: event.hostId,
    title: event.title,
  });

  return event;
};

export const getAllEventsService = async () => {
  const events = await prisma.event.findMany();
  return events;
};
