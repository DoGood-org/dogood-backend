import logger from '@/utils/logger';
import { Server as IOServer, Socket as IOSocket } from 'socket.io';
import { ensureAuth } from '@/utils/ensureAuthSocket';
import {
  ChatSocketEvents,
  DeleteMessagePayload,
  EditMessagePayload,
  ReactionPayload,
  TypingPayload,
} from '@/types/chatSocket.types';
import { validateMessageContent } from '@/utils/validateChatMessageSct';
import { userPresence } from '@/utils/userPresenceChat';
import throttle from 'lodash/throttle';
import { chatMessageServices } from '@/services/chatSocket.service';

type TypedSocket = IOSocket<ChatSocketEvents>;
type TypedIO = IOServer<ChatSocketEvents>;

export default function eventRoomHandlers(io: TypedIO, socket: TypedSocket) {
  // --- JOIN ROOM ---
  socket.on('joinEventRoom', async ({ eventId }) => {
    const userId = ensureAuth('joinEventRoom', socket);
    if (!userId) return;

    const roomMember = await chatMessageServices.hasRightsToBeInRoom(
      userId,
      eventId
    );
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
    if (isFirstConnection) io.emit('userOnline', { userId });

    socket.data.userId = userId;
    socket.join(eventId);
    io.to(eventId).emit('userJoined', { userId });

    logger.info(
      `Socket ${socket.id} joined room ${eventId}, userId: ${userId} is online`
    );
  });

  // --- SEND MESSAGE ---
  socket.on(
    'sendMessage',
    async (
      payload: { eventId: string; content: string },
      callback?: (response: { error?: string; success?: boolean }) => void
    ) => {
      try {
        const { eventId, content } = payload;
        const userId = ensureAuth('sendMessage', socket, callback);
        if (!userId) return;
        socket.data.userId = userId;

        const allowed = await chatMessageServices.canSendMessage({
          userId,
          roomId: eventId,
          callback,
        });
        if (!allowed) return;

        const trimmed = content.trim();
        if (!validateMessageContent(trimmed, callback)) return;

        const message = await chatMessageServices.sendMessage(eventId, {
          content: trimmed,
          userId,
        });

        io.to(eventId).emit('newMessage', {
          eventId,
          messageId: message.id,
          content: trimmed,
          timestamp: message.createdAt,
          user: {
            id: message.sender.id,
            name: message.sender.name,
            avatar: message.sender.avatar ?? undefined, // тепер avatar лежить без profile
            siteRole: message.sender.siteRole,
          },
        });

        callback?.({ success: true });
      } catch (err: any) {
        logger.error(err);
        callback?.({ error: err.message });
      }
    }
  );

  // --- EDIT MESSAGE ---
  socket.on(
    'editMessage',
    async (
      payload: EditMessagePayload,
      callback?: (res: { success?: boolean; error?: string }) => void
    ) => {
      try {
        const userId = ensureAuth('editMessage', socket, callback);
        if (!userId) return;

        const allowed = await chatMessageServices.canSendMessage({
          userId,
          roomId: payload.eventId,
          callback,
        });
        if (!allowed) return;

        const trimmed = payload.newContent?.trim();
        if (!trimmed)
          return callback?.({ error: 'New message content is empty' });
        if (trimmed.length > 500)
          return callback?.({ error: 'Content exceeds 500 characters' });

        await chatMessageServices.editMessage(
          userId,
          payload.messageId,
          trimmed
        );

        io.to(payload.eventId).emit('messageEdited', {
          messageId: payload.messageId,
          newContent: trimmed,
        });

        logger.info(
          `Socket ${socket.id} edited message in room ${payload.eventId}: ${payload.messageId}`
        );
        callback?.({ success: true });
      } catch (err: any) {
        logger.error(err);
        callback?.({ error: err.message });
      }
    }
  );

  // --- DELETE MESSAGE ---
  socket.on(
    'deleteMessage',
    async (
      payload: DeleteMessagePayload,
      callback?: (res: { success?: boolean; error?: string }) => void
    ) => {
      try {
        const userId = ensureAuth('deleteMessage', socket, callback);
        if (!userId) return;

        const allowed = await chatMessageServices.canSendMessage({
          userId,
          roomId: payload.eventId,
          callback,
        });
        if (!allowed) return;

        await chatMessageServices.deleteMessage(userId, payload.messageId);

        io.to(payload.eventId).emit('messageDeleted', {
          messageId: payload.messageId,
        });
        logger.info(
          `Socket ${socket.id} deleted message in room ${payload.eventId}: ${payload.messageId}`
        );
        callback?.({ success: true });
      } catch (err: any) {
        logger.error(err);
        callback?.({ error: err.message });
      }
    }
  );

  // --- REACT TO MESSAGE ---
  socket.on(
    'reactToMessage',
    async (
      payload: ReactionPayload,
      callback?: (res: { success?: boolean; error?: string }) => void
    ) => {
      try {
        const userId = ensureAuth('reactToMessage', socket, callback);
        if (!userId) return;

        const allowed = await chatMessageServices.canSendMessage({
          userId,
          roomId: payload.eventId,
          callback,
        });
        if (!allowed) return;

        await chatMessageServices.reactToMessage(
          userId,
          payload.messageId,
          payload.reaction
        );

        io.to(payload.eventId).emit('messageReacted', {
          eventId: payload.eventId,
          messageId: payload.messageId,
          reaction: payload.reaction,
          userId,
        });

        logger.info(
          `Socket ${socket.id} reacted in ${payload.eventId} to message ${payload.messageId}: ${payload.reaction}`
        );
        callback?.({ success: true });
      } catch (err: any) {
        logger.error(err);
        callback?.({ error: err.message });
      }
    }
  );

  // --- TYPING ---
  const typingThrottleMap = new Map<string, ReturnType<typeof throttle>>();
  socket.on('typing', (payload: TypingPayload) => {
    const userId = ensureAuth('typing', socket);
    if (!userId) return;

    if (!typingThrottleMap.has(userId)) {
      typingThrottleMap.set(
        userId,
        throttle((eventId: string) => {
          socket.to(eventId).emit('userTyping', { eventId, userId });
        }, 800)
      );
    }
    typingThrottleMap.get(userId)?.(payload.eventId);
    logger.info(`Socket ${socket.id} typing in room ${payload.eventId}`);
  });

  // --- LEAVE ROOM ---
  socket.on('leaveEventRoom', ({ eventId }: { eventId: string }) => {
    const userId = ensureAuth('leaveEventRoom', socket);
    if (!userId) return;

    socket.leave(eventId);
    io.to(eventId).emit('userLeft', { eventId, userId });
    logger.info(`Socket ${socket.id} left room ${eventId}`);
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;

    const isOffline = userPresence.remove(userId, socket.id);
    if (isOffline) io.emit('userOffline', { userId });

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
