import { prisma } from '@/services/prisma';
import { ChatRoom } from '@/types/generalTypes';
import { User } from '@/types/user';
import logger from '@/utils/logger';



export async function deleteMeFromChatRoom(
  userId: number,
  roomId: string
): Promise<ChatRoom> {
  const room: ChatRoom = await prisma.chatRoom.update({
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
      `Room ${roomId} updated, remaining participants: ${room.participants.map((p: User) => p.name).join(', ')}`
    );
  }

  return {
    id: roomId,
    participants: [],
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    wasLeft: true,
    leftAt: new Date().toISOString(),
  };
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
    data: { content: message.content, senderId: message.userId, roomId },
    include: { sender: true }, // optional
  });

  logger.info(
    `New message sent in room ${roomId} by user ${newMessage.senderId}: ${newMessage.content}`
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

export async function reactToMessage(
  userId: number,
  messageId: string,
  reaction: string
) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new Error('Message not found');
  
  const existingReaction = await prisma.messageReaction.findFirst({
    where: { messageId, userId },
  });

  if (existingReaction) {
    // Update existing reaction
    return prisma.messageReaction.update({
      where: { id: existingReaction.id },
      data: { reaction },
    });
  } else {
    // Create new reaction
    return prisma.messageReaction.create({
      data: { messageId, userId, reaction },
    });
  }
}

export async function markMessageAsRead(
  userId: number,
  messageId: string
) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new Error('Message not found');
  
  return prisma.messageRead.create({
    data: { messageId, userId },
  });
}

