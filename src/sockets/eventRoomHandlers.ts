import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';

import { ensureAuth } from '@/utils/ensureAuthSocket';
import { ChatMessagePayload, ChatSocketEvents, ReactionPayload } from '@/types/chatTypes';
import { throttle } from 'lodash';

type TypedSocket = IOSocket<ChatSocketEvents>;
type TypedIO = IOServer<ChatSocketEvents>;
/**
 * Обробники подій для кімнат подій
 * @param socket - екземпляр сокета
 */
export default function eventRoomHandlers(io: TypedIO, socket: TypedSocket) {
  socket.on(`joinEventRoom`, (eventId: string) => {
    const userId = ensureAuth('joinEventRoom', socket);
    if (!userId) return;

    socket.join(eventId);
    io.to(eventId).emit('userJoined', userId);
    logger.info(`Socket ${socket.id} joined room ${eventId}`);
  });
  socket.on('sendMessage', (eventId: string, message: string) => {
    const userId = ensureAuth('sendMessage', socket);
    if (!userId) return;
    const payload: ChatMessagePayload = {
      eventId,
      userId,
      messageId: `${Date.now()}-${userId}-${socket.id}`,
      content: message,
      timestamp: new Date().toISOString(),
    };
    io.to(eventId).emit('newMessage', payload);
  
    logger.info(
      `Socket ${socket.id} sent message in room ${eventId}: ${message}`
    );
  });
  socket.on(
    'editMessage',
    (eventId: string, messageId: string, newContent: string) => {
    const userId = ensureAuth('editMessage', socket);
    if (!userId) return;
    logger.info(
      `Socket ${socket.id} edited message in room ${eventId}: ${messageId} to ${newContent}`
    );
    io.to(eventId).emit('messageEdited', messageId, newContent);
  });
  socket.on('deleteMessage', (eventId: string, messageId: string) => {
    const userId = ensureAuth('deleteMessage', socket);
    if (!userId) return;
    io.to(eventId).emit('messageDeleted', messageId);
    logger.info(
      `Socket ${socket.id} deleted message in room ${eventId}: ${messageId}`
    );
  });
  socket.on(
    'reactToMessage',
    (payload: ReactionPayload) => {
      const userId = ensureAuth('reactToMessage', socket);
      if (!userId) return;

      io.to(payload.eventId).emit('messageReacted', {
        eventId: payload.eventId,
        messageId: payload.messageId,
        reaction: payload.reaction,
        userId: Number(userId),
      });

      logger.info(
        `Socket ${socket.id} reacted to message in room ${payload.eventId}: ${payload.messageId} with reaction ${payload.reaction}`
      );
    }
  );
  const throttledTyping = throttle((eventId: string, userId: number) => {
    socket.to(eventId).emit('userTyping', eventId, userId);
  }, 800);
  socket.on('typing', (eventId: string) => {
    const userId = ensureAuth('typing', socket);
    if (!userId) return;

    throttledTyping(eventId, userId);
    logger.info(`Socket ${socket.id} is typing in room ${eventId}`);
  }
);
socket.on(`disconnect`, () => {
  const userId = socket.data.userId || socket.id;

  for (const room of socket.rooms) {
    if (room !== socket.id) {
      socket.to(room).emit('userLeft', room, userId);
    }
  }
  socket.data.userId = undefined;
});
  socket.on(`leaveEventRoom`, (eventId: string) => {
    socket.leave(eventId);
    logger.info(`Socket ${socket.id} left room ${eventId}`);
  });
}
