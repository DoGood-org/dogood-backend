import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { ensureAuth } from '@/utils/ensureAuthSocket';
import * as chatSocketsService from '@/services/chatSocket.service';

import {
  ChatSocketEvents,
  DeleteMessagePayload,
  EditMessagePayload,
  ReactionPayload,
  TypingPayload,
} from '@/types/chatSocket.types';
import { validateMessageContent } from '@/utils/validateChatMessageSct';
import { userPresence } from '@/utils/userPresenceChat';
import _ from 'lodash';

type TypedSocket = IOSocket<ChatSocketEvents>;
type TypedIO = IOServer<ChatSocketEvents>;

// * Handles events related to event rooms, including joining, sending messages, editing, deleting messages, reacting to messages, typing notifications, and leaving rooms.
// * @param {TypedIO} io - The Socket.IO server instance.
// * @param {TypedSocket} socket - The Socket.IO socket instance for the connected user.
// * @returns {void}

export default function eventRoomHandlers(io: TypedIO, socket: TypedSocket) {
  socket.on('joinEventRoom', ({ eventId }) => {
    const userId = ensureAuth('joinEventRoom', socket);
    if (!userId) return;
    const roomMember = chatSocketsService.hasRightsToBeInRoom(userId, eventId);
    if (!roomMember) {
      logger.warn(
        `User ${userId} tried to join room ${eventId} without rights`
      );
      socket.emit('error', {
        message: 'You do not have permission to join this room.',
      });
      return;
    }
    const isFirstConnection = userPresence.add(userId, socket.id);
    if (isFirstConnection) {
      io.emit('userOnline', { userId });
    }
    socket.join(eventId);
    io.to(eventId).emit('userJoined', { userId });
    logger.info(
      `Socket ${socket.id} joined room ${eventId}, userId: ${userId} is online`
    );
  });
  socket.on(
    'sendMessage',
    (
      payload: { eventId: string; content: string },
      callback: (response: { error?: string; success?: boolean }) => void
    ) => {
      (async () => {
        const { eventId, content } = payload;

        const userId = ensureAuth('sendMessage', socket, callback);
        if (!userId) return;

        const allowedToSend = await chatSocketsService.canSendMessage({
          userId,
          roomId: eventId,
          callback,
        });
        if (!allowedToSend) return;

        const trimmed = content.trim();
        if (!validateMessageContent(trimmed, callback)) return;

        const messageId = _.uniqueId('msg_');
        const timestamp = new Date().toISOString();

        await chatSocketsService.sendMessage(eventId, {
          content: trimmed,
          userId,
        });

        io.to(eventId).emit('newMessage', {
          userId,
          eventId,
          messageId,
          timestamp,
          content: trimmed,
        });

        callback?.({ success: true });
      })();
    }
  );

  socket.on(
    'editMessage',
    async (
      payload: EditMessagePayload,
      callback?: (response: { success?: boolean; error?: string }) => void
    ) => {
      const userId = ensureAuth('editMessage', socket, callback);
      if (!userId) return;

      const allowedToEdit = await chatSocketsService.canSendMessage({
        userId,
        roomId: payload.eventId,
        callback,
      });
      if (!allowedToEdit) return;

      const trimmed = payload.newContent?.trim();
      if (!trimmed)
        return callback?.({ error: 'New message content is empty' });
      if (trimmed.length > 500)
        return callback?.({ error: 'Content exceeds 500 characters' });

      await chatSocketsService.editMessage(userId, payload.messageId, trimmed);

      io.to(payload.eventId).emit('messageEdited', {
        messageId: payload.messageId,
        newContent: trimmed,
      });

      logger.info(
        `Socket ${socket.id} edited message in room ${payload.eventId}: ${payload.messageId}`
      );
      callback?.({ success: true });
    }
  );

  socket.on(
    'deleteMessage',
    async (
      payload: DeleteMessagePayload,
      callback?: (response: { success?: boolean; error?: string }) => void
    ) => {
      const userId = ensureAuth('deleteMessage', socket, callback);
      if (!userId) return;

      const allowedToDelete = await chatSocketsService.canSendMessage({
        userId,
        roomId: payload.eventId,
        callback,
      });
      if (!allowedToDelete) return;

      await chatSocketsService.deleteMessage(userId, payload.messageId);

      io.to(payload.eventId).emit('messageDeleted', {
        messageId: payload.messageId,
      });

      logger.info(
        `Socket ${socket.id} deleted message in room ${payload.eventId}: ${payload.messageId}`
      );

      callback?.({ success: true });
    }
  );

  socket.on(
    'reactToMessage',
    async (
      payload: ReactionPayload,
      callback?: (response: { success?: boolean; error?: string }) => void
    ) => {
      const userId = ensureAuth('reactToMessage', socket, callback);
      if (!userId) return;

      const allowedToReact = await chatSocketsService.canSendMessage({
        userId,
        roomId: payload.eventId,
        callback,
      });
      if (!allowedToReact) return;

      io.to(payload.eventId).emit('messageReacted', {
        eventId: payload.eventId,
        messageId: payload.messageId,
        reaction: payload.reaction,
        userId,
      });

      await chatSocketsService.reactToMessage(
        userId,
        payload.messageId,
        payload.reaction
      );

      logger.info(
        `Socket ${socket.id} reacted in ${payload.eventId} to message ${payload.messageId}: ${payload.reaction}`
      );
      callback?.({ success: true });
    }
  );

  const throttle = _.throttle;

  const typingThrottleMap = new Map<number, ReturnType<typeof throttle>>();

  socket.on('typing', (payload: TypingPayload) => {
    const userId = ensureAuth('typing', socket);
    if (!userId) return;

    if (!typingThrottleMap.has(userId)) {
      typingThrottleMap.set(
        userId,
        throttle((eventId) => {
          socket.to(eventId).emit('userTyping', { eventId, userId });
        }, 800)
      );
    }
    typingThrottleMap.get(userId)?.(payload.eventId);
    logger.info(`Socket ${socket.id} typing in room ${payload.eventId}`);
  });

  socket.on('leaveEventRoom', (payload: { eventId: string }) => {
    const userId = ensureAuth('leaveEventRoom', socket);
    if (!userId) return;

    socket.leave(payload.eventId);
    io.to(payload.eventId).emit('userLeft', {
      eventId: payload.eventId,
      userId,
    });
    logger.info(`Socket ${socket.id} left room ${payload.eventId}`);
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;
    const isNowOffline = userPresence.remove(userId, socket.id);
    if (isNowOffline) {
      io.emit('userOffline', { userId });
    }
    typingThrottleMap.delete(userId);

    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('userLeft', { eventId: room, userId });
      }
    }
    socket.data.userId = undefined;
    logger.info(`Socket ${socket.id} disconnected`);
  });
}
