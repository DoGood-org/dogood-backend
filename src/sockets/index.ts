import { Server } from 'socket.io';
import eventRoomHandlers from './eventRoomHandlers';
import logger from '../utils/logger';
import botHandlers from './botHandlers';
import taskHandlers from './taskHandlers';
import { userPresence } from '@/utils/userPresenceChat';

/**
 * Реєстрація обробників подій для сокетів
 * @param io - екземпляр Socket.IO сервера
 */
export default function registerSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    logger.info(`🟢 Socket connected: ${socket.id}`);

    eventRoomHandlers(io, socket);
    taskHandlers(socket);
    botHandlers(io, socket);

    socket.on('getOnlineUsers', (_, callback) => {
      if (typeof callback === 'function') {
        callback(userPresence.getOnlineUsers());
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔴 Socket disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      logger.error(`❌ Socket error: ${error}`);
    });
  });
}
