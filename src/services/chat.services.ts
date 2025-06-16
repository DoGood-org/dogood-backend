import { prisma } from '@/services/prisma';
import logger from '@/utils/logger';




/**
 * Creates a new chat room in the database.
 * @param {number} userId - The ID of the user creating the chat room.
 * @param {number[]} [participantsIds=[]] - An array of participant user IDs to be added to the chat room.
 * @returns {Promise<Object>} The created chat room object.
 */
export  async function createChatRoom(
  userId: number,
  participantsIds: number[] = []
) {
  const allInvited = Array.from(new Set([...participantsIds]));
  const users = await prisma.user.findMany({
    where: { id: { in: [userId, ...allInvited] } },
    select: { id: true },
  });
  const existingIds = users.map((u) => u.id);
  const room = await prisma.chatRoom.create({
    data: {
      participants: {
        connect: existingIds.map((id) => ({ id })),
      },
    },
    include: { participants: true },
  });
  logger.info(`New Chat Room Created: ${room}
    Participants: ${room.participants.map((p) => p.name).join(', ')}`);

  return {
    id: room.id,
    participants: room.participants.flatMap((participant) => ({
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      siteRole: participant.siteRole,
    })),
  };
}

/**
 * Retrieves a chat room by its ID.
 * @param {string} roomId - The ID of the chat room to retrieve.
 * @returns {Promise<Object|null>} The chat room object or null if not found.
 */
export async function getChatRoomById(userId: number, roomId: string) {
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: { id: userId },
      },
    },
    include: {
      participants: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!room) {
    logger.warn(`User ${userId} is not allowed to access room ${roomId}`);
    throw new Error(
      `Chat room with ID ${roomId} not found or user ${userId} is not a participant.`
    );
  }

  logger.info(`User ${userId} is allowed to access room ${roomId}`);
  return room;
}

/**
 * Deletes the current user from a chat room.
 * @param {number} userId - The ID of the user to remove.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<Object>} The updated chat room object or an error if the room is empty.
 */

export async function deleteMeFromChatRoom(userId: number, roomId: string) {
  const room = await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      participants: {
        disconnect: { id: userId },
      },
    },
    include: { participants: true },
  });
  logger.info(`User ${userId} left room ${room.id}`);

  if (room.participants.length === 0) {
    await prisma.chatRoom.delete({ where: { id: roomId } });
    logger.info(`Room ${roomId} is empty and has been deleted.`);
    throw new Error(`Room ${roomId} is empty and has been deleted.`);
  } else {
    logger.info(
      `Room ${roomId} updated, remaining participants: ${room.participants.map((p) => p.name).join(', ')}`
    );
  }

  return room;
}
// **Retrieves all chat rooms for a user.
export async function getChatRoomsForUser(userId: number) {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: { id: userId },
      },
    },
    include: {
      participants: {
        select: { id: true, name: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  return rooms;
}
/**
 * Retrieves messages from a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<Array<Object>>} An array of message objects.
 */
export async function getMessagesForChatRoom(
  roomId: string,
  userId: number,
  limit = 20,
  cursor?: string
) {
  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    take: limit + 1, // fetch one extra for "hasMore"
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, name: true } },
      // readBy: { where: { id: userId }, select: { id: true } }, // optional for unread
    },
  });

  const hasMore = messages.length > limit;
  return {
    messages: messages.slice(0, limit),
    nextCursor: hasMore ? messages[limit].id : null,
  };
}

/**
 * Adds a user to a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {number} userId - The ID of the user to add.
 * @returns {Promise<Object>} The updated chat room object.
 */
export async function addUserToChatRoom(roomId: string, userId: number) {
  const existingRoom = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { participants: true },
  });

  if (!existingRoom) {
    logger.warn(`Chat room ${roomId} not found`);
    throw new Error(`Chat room ${roomId} not found`);
  }
  const isParticipant = existingRoom.participants.some(
    (participant) => participant.id === userId
  );

  if (isParticipant) {
    logger.warn(`User ${userId} is already at the room ${roomId}`);
    throw new Error(`User ${userId} is already at the room ${roomId}`);
  }

  const room = await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      participants: {
        connect: { id: userId },
      },
    },
  });
  return room;
}
/**
 * Removes a user from a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {number} userId - The ID of the user to remove.
 * @returns {Promise<Object>} The updated chat room object.
 */
export async function removeUserFromChatRoom(roomId: string, userId: number) {
  const room = await prisma.chatRoom.update({
    where: {
      id: roomId,
      participants: {
        some: { id: userId },
      },
    },
    data: {
      participants: {
        disconnect: { id: userId },
      },
    },
  });
  return room;
}

/**
 * Sends a message in a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {Object} message - The message object containing content and senderId.
 * @returns {Promise<Object>} The created message object.
 */
export async function sendMessage(
  roomId: string,
  message: { content: string; userId: number }
) {
  const allowedToSend = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: { id: message.userId },
      },
    },
  });
  if (!allowedToSend) {
    logger.warn(
      `User ${message.userId} is not allowed to send messages in room ${roomId}`
    );
    throw new Error(
      `User ${message.userId} is not a participant of room ${roomId}`
    );
  }

  const newMessage = await prisma.chatMessage.create({
    data: {
      content: message.content,
      senderId: message.userId,
      roomId: roomId,
    },
  });
  logger.info(
    `New message sent in room ${roomId} by user ${message.userId}: ${newMessage.content}`
  );

  return newMessage;
}

/**
 * Deletes a message by its ID.
 * @param {number} userId - The ID of the user attempting to delete the message.
 * @param {string} messageId - The ID of the message to delete.
 * @returns {Promise<Object>} The deleted message object.
 */
export async function deleteMessage(userId: number, messageId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new Error('Message not found');
  if (message.senderId !== userId)
    throw new Error('Forbidden: not your message');

  return prisma.chatMessage.delete({ where: { id: messageId } });
}

/**
 * Edits a message by its ID.
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} content - The new content for the message.
 * @returns {Promise<Object>} The updated message object.
 */
export async function editMessage(
  userId: number,
  messageId: string,
  content: string
) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId, senderId: userId },
  });
  if (!message) {
    logger.warn(
      `Message ${messageId} not found or user ${userId} is not the sender.`
    );
    throw new Error(
      `Message with ID ${messageId} not found or user ${userId} is not the sender.`
    );
  }
  if (message.content === content) {
    logger.info(`Message ${messageId} by user ${userId} has no changes.`);
    return message; // No changes to update
  }

  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content },
  });
  logger.info(
    `Message ${messageId} edited by user ${userId}: ${updatedMessage.content}`
  );
  return updatedMessage;
}

