import { prisma } from '@/config/prisma';
import {
  IChatMessage,
  IChatMessageEditedDeletedReactedOn,
  IReadStatus,
} from '@/types/chat.types';


import logger from '@/utils/logger';
import { SiteRole } from '@prisma/client';

/**
 * Checks if a user can send a message in a specific chat room.
 * @param {number} userId - The ID of the user.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<boolean>} True if the user can send a message, false otherwise.
 */
 async function canSendMessage(params: {
  userId: string;
  roomId: string;
  callback?: (res: { error: string }) => void;
}): Promise<boolean> {
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
 * Checks if a user is already in a specific chat room.
 * @param {string} userId - The ID of the user.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<boolean>} True if the user is in the room, false otherwise.
 */
 async function hasRightsToBeInRoom(
  userId: string,
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

  if (!participant) {
    return false; // User is not in the room
  }

  return participant.wasLeft === false; // User is in the room and hasn't left
}

/**
 * Sends a message in a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {Object} message - The message object containing content and userId.
 * @returns {Promise<ChatMessage>} The created chat message object.
 */
 async function sendMessage(
  roomId: string,
  message: { content: string; userId: string }
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
    data: {
      content: message.content,
      senderId: message.userId,
      roomId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          siteRole: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      },
      reactions: true,
    },
  });

  const mappedMessage: IChatMessage = {
    id: newMessage.id,
    roomId: newMessage.roomId,
    senderId: newMessage.senderId,
    content: newMessage.content,
    createdAt: newMessage.createdAt.toISOString(),
    updatedAt: newMessage.updatedAt.toISOString(),
    sender: {
      id: newMessage.sender.id,
      name: newMessage.sender.name,
      avatar: newMessage.sender.profile?.avatar ?? undefined,
      siteRole: newMessage.sender.siteRole as SiteRole,
    },
    reactions: newMessage.reactions.map((r) => ({
      reactionId: r.id.toString(),
      reaction: r.reaction,
      userId: r.userId,
    })),
  };

  return mappedMessage;
}

/**
 * Deletes a message by its ID.
 * @param {string} userId - The ID of the user attempting to delete the message.
 * @param {string} messageId - The ID of the message to delete.
 * @returns {Promise<Object>} The deleted message object.
 */
 async function deleteMessage(
  userId: string,
  messageId: string
): Promise<IChatMessageEditedDeletedReactedOn> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          siteRole: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      },
      reactions: true,
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
      id: message.sender.id,
      name: message.sender.name,
      avatar: message.sender.profile?.avatar ?? undefined,
      siteRole: message.sender.siteRole as SiteRole,
    },
    reactions: message.reactions.map((r) => ({
      reactionId: r.id.toString(),
      reaction: r.reaction,
      userId: r.userId,
    })),
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
 async function editMessage(
  userId: string,
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
          siteRole: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      },
      reactions: true,
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
        id: existing.sender.id,
        name: existing.sender.name,
        avatar: existing.sender.profile?.avatar ?? undefined,
        siteRole: existing.sender.siteRole as SiteRole,
      },
      reactions: existing.reactions.map((r) => ({
        reactionId: r.id.toString(),
        reaction: r.reaction,
        userId: r.userId,
      })),
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
          siteRole: true,
          profile: {
            select: {
              avatar: true,
            },
          },
        },
      },
      reactions: true,
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
      id: updated.sender.id,
      name: updated.sender.name,
      avatar: updated.sender.profile?.avatar ?? undefined,
      siteRole: updated.sender.siteRole as SiteRole,
    },
    reactions: updated.reactions.map((r) => ({
      reactionId: r.id.toString(),
      reaction: r.reaction,
      userId: r.userId,
    })),
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
 async function reactToMessage(
  userId: string,
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
          siteRole: true,
          profile: { select: { avatar: true } },
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

  if (existingReaction) {
    if (existingReaction.reaction !== reaction) {
      await prisma.chatMessageReaction.update({
        where: { id: existingReaction.id },
        data: { reaction },
      });
    }
    logger.info(
      `User ${userId} reacted to message ${messageId} with "${reaction}".`
    );
  } else {
    await prisma.chatMessageReaction.create({
      data: { messageId, userId, reaction },
    });
    logger.info(
      `User ${userId} added reaction "${reaction}" to message ${messageId}.`
    );
  }

  // Fetch updated reactions
  const updatedReactions = await prisma.chatMessageReaction.findMany({
    where: { messageId },
  });

  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: message.sender.id,
      name: message.sender.name,
      avatar: message.sender.profile?.avatar ?? undefined,
      siteRole: message.sender.siteRole as SiteRole,
    },
    reactions: updatedReactions.map((r) => ({
      reactionId: r.id.toString(),
      reaction: r.reaction,
      userId: r.userId,
    })),
    status: 'reactedOn',
    message: 'Reaction processed',
    updatedAt: new Date().toISOString(),
  };
}

 async function markMessageAsRead(
  userId: string,
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
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      siteRole: true,
      profile: { select: { avatar: true } },
    },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  return {
    userId: readStatus.userId,
    messageId: readStatus.messageId,
    readAt: readStatus.readAt.toISOString(),
    user: {
      id: user.id,
      name: user.name,
      avatar: user.profile?.avatar ?? undefined,
      siteRole: user.siteRole as SiteRole,
    },
  };
}

export const chatMessageServices = {
  canSendMessage,
  hasRightsToBeInRoom,
  sendMessage,
  deleteMessage,
  editMessage,
  reactToMessage,
  markMessageAsRead,
};
