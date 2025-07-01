
import { prisma } from '@/services/prisma';
import { ChatMessage, ChatMessageEditedDeletedReactedOn } from '@/types/chat.types';
import { SiteRoleEnum } from '@/types/user.types';

import logger from '@/utils/logger';

/**
 * Checks if a user can send a message in a specific chat room.
 * @param {number} userId - The ID of the user.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<boolean>} True if the user can send a message, false otherwise.
 */
export async function canSendMessage(
  userId: number,
  roomId: string
): Promise<boolean> {
  const participant = await prisma.userStatusesInChat.findUnique({
    where: {
      userId_roomId: { userId, roomId },
    },
    select: {
      wasLeft: true,
    },
  });

  return participant !== null && participant.wasLeft === false;
}

/**
 * Sends a message in a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {Object} message - The message object containing content and userId.
 * @returns {Promise<ChatMessage>} The created chat message object.
 */

export async function sendMessage(
  roomId: string,
  message: { content: string; userId: number }
): Promise<ChatMessage> {
  const allowedToSend = await prisma.userStatusesInChat.findUnique({
    where: { userId_roomId: { userId: message.userId, roomId } },
    select: { wasLeft: true },
  });

  if (!allowedToSend || allowedToSend.wasLeft) {
    throw new Error(
      `User ${message.userId} is not allowed to send messages in room ${roomId}`
    );
  }

  const newMessage = await prisma.chatMessage.create({
    data: { content: message.content, senderId: message.userId, roomId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatar: true,
          siteRole: true,
        },
      },
    },
  });

  return {
    id: newMessage.id,
    content: newMessage.content,
    senderId: newMessage.senderId,
    roomId: newMessage.roomId,
    createdAt: newMessage.createdAt.toISOString(),
    sender: {
      ...newMessage.sender,
      avatar: newMessage.sender.avatar === null ? undefined : newMessage.sender.avatar,
      siteRole: (newMessage.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
    },
    reactions: [],
  };
}



/**
 * Deletes a message by its ID.
 * @param {number} userId - The ID of the user attempting to delete the message.
 * @param {string} messageId - The ID of the message to delete.
 * @returns {Promise<Object>} The deleted message object.
 */
export async function deleteMessage(
  userId: number,
  messageId: string
): Promise<ChatMessageEditedDeletedReactedOn> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatar: true,
          siteRole: true,
        },
      },
    },
  });

  if (!message) throw new Error('Message not found');
  if (message.senderId !== userId)
    throw new Error('Forbidden: not your message');

  await prisma.chatMessage.delete({ where: { id: messageId } });

  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
    reactions: [],
    status: 'deleted',
    message: 'Message deleted successfully',
    deletedAt: new Date().toISOString(),
  };
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
): Promise<ChatMessageEditedDeletedReactedOn> {
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
    return {
      ...message,
      status: 'edited',
      message: 'Message edited successfully',
      editedAt: new Date().toISOString(),
    };
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

/*
 * Reacts to a message in a chat room.
 * @param {number} userId - The ID of the user reacting to the message.
 * @param {string} messageId - The ID of the message to react to.
 * @param {string} reaction - The reaction emoji or text.
 * @returns {Promise<Object>} The created or updated reaction object.
 */

export async function reactToMessage(
  userId: number,
  messageId: string,
  reaction: string
): Promise<ChatMessageEditedDeletedReactedOn> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          participants: {
            where: { userId, wasLeft: false },
          },
        },
      },
    },
  });

  if (!message || message.room.participants.length === 0)
    throw new Error('Message not found or user not in the room');

  const existingReaction = await prisma.chatMessageReaction.findFirst({
    where: { messageId, userId },
  });

  if (existingReaction) {
    if (existingReaction.reaction === reaction) {
      logger.info(
        `User ${userId} already reacted with "${reaction}" to message ${messageId}.`
      );
      return existingReaction;
    }
    return prisma.chatMessageReaction.update({
      where: { id: existingReaction.id },
      data: { reaction },
    });
  }

  return prisma.chatMessageReaction.create({
    data: { messageId, userId, reaction },
  });
}

export async function markMessageAsRead() {}
