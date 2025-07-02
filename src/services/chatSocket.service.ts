import { prisma } from '@/services/prisma';
import {
  IChatMessage,
  IChatMessageEditedDeletedReactedOn,
  IReadStatus,
} from '@/types/chat.types';
import { SiteRoleEnum } from '@/types/user.types';

import logger from '@/utils/logger';

/**
 * Checks if a user can send a message in a specific chat room.
 * @param {number} userId - The ID of the user.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<boolean>} True if the user can send a message, false otherwise.
 */
export async function canSendMessage(
  params: { userId: number; roomId: string; callback?: (res: { error: string }) => void }
): Promise<boolean> {
  const { userId, roomId, callback } = params;
  const participant = await prisma.userStatusesInChat.findUnique({
    where: {
      userId_roomId: { userId, roomId },
    },
    select: {
      wasLeft: true,
    },
  });

  if (!participant) {
    const error = `User ${userId} is not a participant in room ${roomId}`;
    logger.warn(error);
    callback?.({ error });
    return false;
  }

  return participant.wasLeft === false;
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
): Promise<IChatMessage> {
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
      avatar:
        newMessage.sender.avatar === null
          ? undefined
          : newMessage.sender.avatar,
      siteRole:
        (newMessage.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
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
): Promise<IChatMessageEditedDeletedReactedOn> {
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
    sender: {
      ...message.sender,
      avatar:
        message.sender.avatar === null ? undefined : message.sender.avatar,
      siteRole: (message.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
    },
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
): Promise<IChatMessageEditedDeletedReactedOn> {
  const existing = await prisma.chatMessage.findUnique({
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

  if (!existing || existing.senderId !== userId) {
    logger.warn(
      `Message ${messageId} not found or user ${userId} is not the sender.`
    );
    throw new Error(
      `Message with ID ${messageId} not found or user ${userId} is not the sender.`
    );
  }

  if (existing.content === content) {
    logger.info(`Message ${messageId} by user ${userId} has no changes.`);
    return {
      id: existing.id,
      roomId: existing.roomId,
      senderId: existing.senderId,
      content: existing.content,
      createdAt: existing.createdAt.toISOString(),
      sender: {
        ...existing.sender,
        avatar:
          existing.sender.avatar === null ? undefined : existing.sender.avatar,
        siteRole:
          (existing.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
      },
      reactions: [],
      status: 'edited',
      message: 'Message unchanged',
      editedAt: new Date().toISOString(),
    };
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content },
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

  logger.info(
    `Message ${messageId} edited by user ${userId}: ${updated.content}`
  );

  return {
    id: updated.id,
    roomId: updated.roomId,
    senderId: updated.senderId,
    content: updated.content,
    createdAt: updated.createdAt.toISOString(),
    sender: {
      ...updated.sender,
      avatar:
        updated.sender.avatar === null ? undefined : updated.sender.avatar,
      siteRole: (updated.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
    },
    reactions: [],
    status: 'edited',
    message: 'Message updated successfully',
    editedAt: new Date().toISOString(),
  };
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
): Promise<IChatMessageEditedDeletedReactedOn> {
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
      room: {
        include: {
          participants: {
            where: { userId, wasLeft: false },
          },
        },
      },
    },
  });

  if (!message || message.room.participants.length === 0) {
    throw new Error('Message not found or user not in the room');
  }

  const existingReaction = await prisma.chatMessageReaction.findFirst({
    where: { messageId, userId },
  });

  let finalReaction;

  if (existingReaction) {
    if (existingReaction.reaction === reaction) {
      logger.info(
        `User ${userId} already reacted with "${reaction}" to message ${messageId}.`
      );
      finalReaction = existingReaction;
    } else {
      finalReaction = await prisma.chatMessageReaction.update({
        where: { id: existingReaction.id },
        data: { reaction },
      });
    }
  } else {
    finalReaction = await prisma.chatMessageReaction.create({
      data: { messageId, userId, reaction },
    });
  }

  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    sender: {
      ...message.sender,
      avatar:
        message.sender.avatar === null ? undefined : message.sender.avatar,
      siteRole: (message.sender.siteRole as SiteRoleEnum) || SiteRoleEnum.USER,
    },
    reactions: [
      {
        reactionId: finalReaction.id.toString(),
        reaction: finalReaction.reaction,
        userId: finalReaction.userId,
      },
    ],
    status: 'reactedOn',
    message: 'Reaction processed',
    updatedAt: new Date().toISOString(),
  };
}

export async function markMessageAsRead(
  userId: number,
  messageId: string
): Promise<IReadStatus> {
  const readStatus = await prisma.readStatus.upsert({
    where: {
      userId_messageId: {
        userId,
        messageId,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      userId,
      messageId,
    },
    include: {
      user: {
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
    userId: readStatus.userId,
    messageId: readStatus.messageId,
    readAt: readStatus.readAt.toISOString(),
    user: {
      id: readStatus.user.id,
      name: readStatus.user.name,
      avatar: readStatus.user.avatar ?? undefined,
      siteRole: readStatus.user.siteRole as SiteRoleEnum,
    },
  };
}
