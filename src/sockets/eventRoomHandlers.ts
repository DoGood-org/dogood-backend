import { Socket } from 'socket.io';

/**
 * Обробники подій для кімнат подій
 * @param socket - екземпляр сокета
 */
export default function eventRoomHandlers(socket: Socket) {
  socket.on('joinEventRoom', (eventId: string) => {
    socket.join(eventId);
    console.log(`Socket ${socket.id} joined room ${eventId}`);
  });

  socket.on('leaveEventRoom', (eventId: string) => {
    socket.leave(eventId);
    console.log(`Socket ${socket.id} left room ${eventId}`);
  });
}
