import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { ensureAuth } from '@/utils/ensureAuthSocket';

/**
 * Handles private notification rooms for users.
 * * - Automatically joins the user to a room named after their userId.
 * - This allows the server to send private notifications using io.to(userId).
 */
export default function notificationHandlers(io: IOServer, socket: IOSocket) {
  const userId = ensureAuth('notificationInit', socket);

  if (userId) {
    socket.join(userId);
    
    logger.info(`🔔 Socket ${socket.id} joined private notification room: ${userId}`);
  }

  socket.on('disconnect', () => {
    logger.info(`🔕 Socket ${socket.id} left notification room`);
  });
}