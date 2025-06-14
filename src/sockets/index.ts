import { Server } from 'socket.io';
import eventRoomHandlers from './eventRoomHandlers';
import logger from '../utils/logger';
import mapHandlers from './mapHandlers';
import botHandlers from './botHandlers';

/**
 * Реєстрація обробників подій для сокетів
 * @param io - екземпляр Socket.IO сервера
 */
export default function registerSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    logger.info(`🟢 Socket connected: ${socket.id}`);

    eventRoomHandlers(socket);
    mapHandlers(socket);
    botHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`🔴 Socket disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      logger.error(`❌ Socket error: ${error}`);
    });
  });
}
