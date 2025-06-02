import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';

interface CreateEventInput {
  title: string;
  description: string;
  hostId: number;
  categories: number[];
  startTime: string | Date;
  endTime: string | Date;
  latitude: number;
  longitude: number;
}

export const createEventService = async (data: CreateEventInput) => {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      latitude: data.latitude,
      longitude: data.longitude,
      categories: {
        connect: data.categories.map((categoryId) => ({ id: categoryId })),
      },
    },
    include: {
      categories: true,
    },
  });

  return event;
};

export const isEventExists = async (data: CreateEventInput) => {
  const existing = await prisma.event.findFirst({
    where: {
      title: data.title,
      startTime: new Date(data.startTime),
      hostId: data.hostId,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  return Boolean(existing);
};



export const getEventByIdService = async (eventId: number) => {
  return prisma.event.findUnique({
    where: { id: eventId },
  });
};

export const getAllEventsService = async () => {
  const events = await prisma.event.findMany({
    include: {
      categories: true,
      host: true,
      joinedUsers: true,
    },
  });
  return events;
};

export const deleteEventService = async (eventId: number) => {
  const deletedEvent = await prisma.event.delete({
    where: { id: eventId },
  });

  logger.info('✅ Event deleted successfully', { eventId });

  return deletedEvent;
};
