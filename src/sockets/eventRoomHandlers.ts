import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { ensureAuth } from '@/utils/ensureAuthSocket';
import {
  ChatMessagePayload,
  ChatSocketEvents,
  ReactionPayload,
} from '@/types/chatTypes';
import { throttle } from 'lodash';

type TypedSocket = IOSocket<ChatSocketEvents>;
type TypedIO = IOServer<ChatSocketEvents>;

export default function eventRoomHandlers(io: TypedIO, socket: TypedSocket) {
  socket.on('joinEventRoom', ({ eventId }) => {
    const userId = ensureAuth('joinEventRoom', socket);
    if (!userId) return;

    socket.join(eventId);
    io.to(eventId).emit('userJoined', { userId });
    logger.info(`Socket ${socket.id} joined room ${eventId}`);
  });

  socket.on('sendMessage', ({ eventId, content }) => {
    const userId = ensureAuth('sendMessage', socket);
    if (!userId) return;

    const payload: ChatMessagePayload = {
      eventId,
      userId,
      messageId: `${Date.now()}-${userId}-${socket.id}`,
      content,
      timestamp: new Date().toISOString(),
    };

    io.to(eventId).emit('newMessage', payload);
    logger.info(
      `Socket ${socket.id} sent message in room ${eventId}: ${content}`
    );
  });

  socket.on('editMessage', ({ eventId, messageId, newContent }) => {
    const userId = ensureAuth('editMessage', socket);
    if (!userId) return;

    io.to(eventId).emit('messageEdited', { messageId, newContent });
    logger.info(
      `Socket ${socket.id} edited message in room ${eventId}: ${messageId}`
    );
  });

  socket.on('deleteMessage', ({ eventId, messageId }) => {
    const userId = ensureAuth('deleteMessage', socket);
    if (!userId) return;

    io.to(eventId).emit('messageDeleted', { messageId });
    logger.info(
      `Socket ${socket.id} deleted message in room ${eventId}: ${messageId}`
    );
  });

  socket.on('reactToMessage', (payload: ReactionPayload) => {
    const userId = ensureAuth('reactToMessage', socket);
    if (!userId) return;

    io.to(payload.eventId).emit('messageReacted', {
      ...payload,
      userId,
    });

    logger.info(
      `Socket ${socket.id} reacted in ${payload.eventId} to message ${payload.messageId}: ${payload.reaction}`
    );
  });

  const throttledTyping = throttle((eventId: string, userId: number) => {
    socket.to(eventId).emit('userTyping', { eventId, userId });
  }, 800);

  socket.on('typing', ({ eventId }) => {
    const userId = ensureAuth('typing', socket);
    if (!userId) return;

    throttledTyping(eventId, userId);
    logger.info(`Socket ${socket.id} typing in room ${eventId}`);
  });

  socket.on('leaveEventRoom', ({ eventId }) => {
    const userId = ensureAuth('leaveEventRoom', socket);
    if (!userId) return;

    socket.leave(eventId);
    io.to(eventId).emit('userLeft', { eventId, userId });
    logger.info(`Socket ${socket.id} left room ${eventId}`);
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;

    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('userLeft', { eventId: room, userId });
      }
    }
    socket.data.userId = undefined;
    logger.info(`Socket ${socket.id} disconnected`);
  });
}
