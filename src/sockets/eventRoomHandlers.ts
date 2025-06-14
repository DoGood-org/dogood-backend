import logger from '@/utils/logger';
import { Socket } from 'socket.io';

/**
 * Обробники подій для кімнат подій
 * @param socket - екземпляр сокета
 */
export default function eventRoomHandlers(socket: Socket, prefix: string) {
  socket.on(`${prefix}joinEventRoom`, (eventId: string) => {  
    socket.join(eventId);
    logger.info(`Socket ${socket.id} joined room ${eventId}`);
    // Socket joined room: ${socket.id} -> ${eventId}
  });

  socket.on(`${prefix}leaveEventRoom`, (eventId: string) => {
    socket.leave(eventId);
    logger.info(`Socket ${socket.id} left room ${eventId}`);
  });
}
