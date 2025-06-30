import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { ensureAuth } from '@/utils/ensureAuthSocket';
import * as chatSocketsService from '@/services/chatSocket.service';
import _ from 'lodash';








import {
  ChatMessagePayload,
  ChatSocketEvents,
  ReactionPayload,
} from '@/types/chatSocket.types';

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

  socket.on('sendMessage', async ({ eventId, content }) => {
    const userId = ensureAuth('sendMessage', socket);
    if (!userId) return;
    if (!content || content.trim() === '') {
      logger.warn(`Socket ${socket.id} tried to send an empty message`);
      return;
    }
    if (content.length > 500) {
      logger.warn(
        `Socket ${socket.id} tried to send a message exceeding 500 characters`
      );
      return;
    }
    const allowedToSend = chatSocketsService.canSendMessage(userId, eventId);
    if (!allowedToSend) {
      logger.warn(`Socket ${socket.id} is not allowed to send messages in room ${eventId}`);
      return;
    }


    const payload: ChatMessagePayload = {
      eventId,
      userId,
      messageId: `${Date.now()}-${userId}-${socket.id}`,
      content,
      timestamp: new Date().toISOString(),
    };


    io.to(eventId).emit('newMessage', payload);
    await chatSocketsService.sendMessage(eventId, {
      content,
      userId,
    });
    logger.info(
      `Socket ${socket.id} sent message in room ${eventId}: ${content}`
    );
  });

  socket.on('editMessage', async ({ eventId, messageId, newContent }) => {
    const userId = ensureAuth('editMessage', socket);
    if (!userId) return;
    const allowedToEdit = chatSocketsService.canSendMessage(userId, eventId);
    if (!allowedToEdit) {
      logger.warn(`Socket ${socket.id} is not allowed to edit messages in room ${eventId}`);
      return;
    }

    await chatSocketsService.editMessage(userId, messageId, newContent);

    io.to(eventId).emit('messageEdited', { messageId, newContent });
    logger.info(
      `Socket ${socket.id} edited message in room ${eventId}: ${messageId}`
    );
  });

  socket.on('deleteMessage', async ({ eventId, messageId }) => {
    const userId = ensureAuth('deleteMessage', socket);
    if (!userId) return;
    const allowedToDelete = chatSocketsService.canSendMessage(userId, eventId);
    if (!allowedToDelete) {
      logger.warn(`Socket ${socket.id} is not allowed to delete messages in room ${eventId}`);
      return;
    }

    await chatSocketsService.deleteMessage(userId, messageId);
    io.to(eventId).emit('messageDeleted', { messageId });
    logger.info(
      `Socket ${socket.id} deleted message in room ${eventId}: ${messageId}`
    );
  });

  socket.on('reactToMessage', async (payload: ReactionPayload) => {
    const userId = ensureAuth('reactToMessage', socket);
    if (!userId) return;
    const allowedToReact = chatSocketsService.canSendMessage(userId, payload.eventId);
    if (!allowedToReact) {
      logger.warn(`Socket ${socket.id} is not allowed to react to messages in room ${payload.eventId}`);
      return;
    }


    io.to(payload.eventId).emit('messageReacted', {
      ...payload,
      userId,
    });

    logger.info(
      `Socket ${socket.id} reacted in ${payload.eventId} to message ${payload.messageId}: ${payload.reaction}`
    );
  });
  const throttle = _.throttle;


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
