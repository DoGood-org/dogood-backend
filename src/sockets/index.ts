import { Server } from 'socket.io';
import eventRoomHandlers from './eventRoomHandlers';
import taskHandlers from './taskHandlers';
import botHandlers from './botHandlers';
import notificationHandlers from './notification.handler';
import logger from '@/utils/logger';
import { socketAuthMiddleware } from './auth.middleware';
import { setIO } from '@/sockets/socketHandler'; 

export default function registerSocketHandlers(io: Server) {
  setIO(io); 

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const status = socket.data.userId ? `User ${socket.data.userId}` : 'Guest';
    logger.info(`🟢 Socket connected: ${socket.id} [${status}]`);


    eventRoomHandlers(io, socket);
    taskHandlers(socket);       
    botHandlers(io, socket);
    notificationHandlers(io, socket); 

    socket.on('disconnect', () => {
      logger.info(`🔴 Socket disconnected: ${socket.id}`);
    });
  });
}