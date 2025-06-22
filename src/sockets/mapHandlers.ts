import { schemas } from '@/schemas/event.schema';
import { createEventService, isEventExists } from '@/services/event.service';
import logger from '@/utils/logger';
import { Socket } from 'socket.io';

export default function mapHandlers(socket: Socket) {
  socket.on('createEvent', async (eventData) => {
    logger.info(`🟡 [${socket.id}] Attempting to create event`, {
      eventData,
    });
    const { error, value } = schemas.createEventSchema.validate(eventData, {
      abortEarly: false,
    });

    if (error) {
      const messages = error.details.map((err) => err.message);
      logger.warn(`🔶 [${socket.id}] Validation failed:`, {
        errors: messages,
      });
      socket.emit('createEventError', { errors: messages });
      return;
    }

    const exists = await isEventExists(value);
    if (exists) {
      logger.warn(`🔶 [${socket.id}] Duplicate event`, { eventData });
      socket.emit('createEventError', {
        errors: [
          'Event with the same title and time or location already exists for this host.',
        ],
      });
      return;
    }

    try {
      const createdEvent = await createEventService(value);

      logger.info(`🟢 [${socket.id}] Event created successfully`, {
        createdEvent,
      });
      socket.emit('createEventSuccess', createdEvent);
      socket.broadcast.emit('newEventCreated', createdEvent);
    } catch (err) {
      logger.error(`❌ [${socket.id}] Failed to create event`, {
        error: err,
      });
      console.error('Error creating event:', err);
      socket.emit('createEventError', {
        errors: ['Something went wrong while creating the event.'],
      });
    }
  });

  socket.on('updateEvent', (updatedEvent) => {
    socket.broadcast.emit('eventUpdated', updatedEvent);
    logger.info(`🔄 [${socket.id}] Event updated`, { updatedEvent });
  });

  socket.on('deleteEvent', (eventId: string) => {
    logger.info(`❌ [${socket.id}] Event deleted`, { eventId });
    socket.broadcast.emit('eventDeleted', eventId);
  });
}

// ! fronted
// import { io } from 'socket.io-client';

// const socket = io('http://localhost:3000');

// // Створення події
// socket.emit('createEvent', {
//   id: '123',
//   title: 'My Event',
//   location: { lat: 47.1, lng: -52.7 },
// });

// // Отримання повідомлення від бота
// socket.emit('messageToBot', 'Привіт, бот!');
// socket.on('botReply', (reply) => {
//   console.log('🤖', reply);
// });
