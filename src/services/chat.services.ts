import { SiteRoleEnum } from '@/types/user.types';
import { prisma } from '@/config/prisma';
import {
  IChatMessage,
  IChatRoom,
  IChatUser,
  IChatUserAdded,
  IUserStatusesInChat,
} from '@/types/chat.types';
import logger from '@/utils/logger';

/**
 * Creates a new chat room with the specified participants.
 * @param userId - The ID of the user creating the chat room.
 * @param participantsIds - An array of participant user IDs.
 * @returns The created chat room object.
 */
export async function createChatRoom(
  userId: string,
  participantsIds: string[]
): Promise<IChatRoom> {
  const allInvited = Array.from(new Set([...participantsIds, userId]));

  const users = await prisma.user.findMany({
    where: { id: { in: allInvited } },
    select: {
      id: true,
      name: true,
      siteRole: true,
      profile: { select: { avatar: true } },
    },
  });

  const existingIds = users.map((u) => u.id);

  const newRoom = await prisma.chatRoom.create({
    data: {
      ownerId: userId,
      name: `Chat ${new Date().toISOString()}`,
      description: '',
      participants: {
        create: existingIds.map((id) => ({
          userId: id,
          joinedAt: new Date(),
        })),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.userStatusesInChat.createMany({
    data: existingIds.map((id) => ({
      userId: id,
      roomId: newRoom.id,
      joinedAt: new Date(),
      wasLeft: false,
    })),
    skipDuplicates: true,
  });

  const roomWithUsers = await prisma.chatRoom.findUnique({
    where: { id: newRoom.id },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              siteRole: true,
              profile: { select: { avatar: true } },
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          siteRole: true,
          profile: { select: { avatar: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              siteRole: true,
              profile: { select: { avatar: true } },
            },
          },
          reactions: {
            select: {
              id: true,
              reaction: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!roomWithUsers) {
    logger.error('Chat room not found after creation');
    throw new Error('Chat room not found after creation');
  }

  return {
    id: roomWithUsers.id,
    ownerId: roomWithUsers.ownerId,
    name: roomWithUsers.name ?? '',
    description: roomWithUsers.description ?? '',
    participants: roomWithUsers.participants.map((p) => ({
      userId: p.userId,
      roomId: p.roomId,
      wasLeft: p.wasLeft,
      leftAt: p.leftAt,
      joinedAt: p.joinedAt,
    })) as IUserStatusesInChat[],
    owner: {
      id: roomWithUsers.owner.id,
      name: roomWithUsers.owner.name,
      siteRole: roomWithUsers.owner.siteRole as SiteRoleEnum,
      avatar: roomWithUsers.owner.profile?.avatar ?? undefined,
    },
    messages: roomWithUsers.messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        siteRole: msg.sender.siteRole as SiteRoleEnum,
        avatar: msg.sender.profile?.avatar ?? undefined,
      },
      roomId: msg.roomId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt ? msg.updatedAt.toISOString() : undefined,
      reactions: msg.reactions.map((r) => ({
        reactionId: r.id.toString(),
        reaction: r.reaction,
        userId: r.userId,
      })),
    })) as IChatMessage[],
    createdAt: roomWithUsers.createdAt.toISOString(),
    updatedAt: roomWithUsers.updatedAt.toISOString(),
  };
}

/**
 * Retrieves a chat room by its ID, including participants and the latest message.
 * @param {string} userId - The ID of the user requesting the chat room.
 * @param {string} roomId - The ID of the chat room to retrieve.
 * @returns {Promise<IChatRoom>} The chat room object with participants and latest message.
 */

export async function getChatRoomById(
  userId: string,
  roomId: string
): Promise<IChatRoom> {
  const userStatusInTheRoom = await prisma.userStatusesInChat.findFirst({
    where: {
      userId,
      roomId,
      wasLeft: false,
    },
    include: {
      room: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              siteRole: true,
              profile: { select: { avatar: true } },
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  siteRole: true,
                  profile: { select: { avatar: true } },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  siteRole: true,
                  profile: { select: { avatar: true } },
                },
              },
              reactions: {
                select: { id: true, userId: true, reaction: true },
              },
            },
          },
        },
      },
    },
  });

  if (!userStatusInTheRoom) {
    logger.warn(`User ${userId} is not allowed to access room ${roomId}`);
    throw new Error(`Chat room with ID ${roomId} not found or access denied.`);
  }

  const room = userStatusInTheRoom.room;

  return {
    id: room.id,
    ownerId: room.ownerId,
    name: room.name ?? '',
    description: room.description ?? '',
    owner: {
      id: room.owner.id,
      name: room.owner.name,
      siteRole: room.owner.siteRole as SiteRoleEnum,
      avatar: room.owner.profile?.avatar ?? undefined,
    },
    participants: room.participants.map((p) => ({
      userId: p.userId,
      roomId: p.roomId,
      wasLeft: p.wasLeft,
      leftAt: p.leftAt,
      joinedAt: p.joinedAt,
    })),
    messages: room.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      sender: {
        id: m.sender.id,
        name: m.sender.name,
        siteRole: m.sender.siteRole as SiteRoleEnum,
        avatar: m.sender.profile?.avatar ?? undefined,
      },
      roomId: m.roomId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt ? m.updatedAt.toISOString() : undefined,
      reactions: m.reactions.map((r) => ({
        reactionId: r.id.toString(),
        reaction: r.reaction,
        userId: r.userId,
      })),
    })),
    createdAt:
      room.createdAt instanceof Date
        ? room.createdAt.toISOString()
        : room.createdAt,
    updatedAt:
      room.updatedAt instanceof Date
        ? room.updatedAt.toISOString()
        : room.updatedAt,
  };
}

/**
 * Deletes the current user from a chat room.
 * @param userId - The ID of the user to remove.
 * @param roomId - The ID of the chat room.
 * @returns The updated chat room object after the user has been removed or unknown
 */
export async function deleteMeFromChatRoom(
  userId: string,
  roomId: string
): Promise<{
  roomId: string;
  userId: string;
  status: 'userQuit' | 'userIsOwner';
  roomStatus?: 'deleted';
}> {
  const room = await prisma.chatRoom.findFirst({
    where: { id: roomId },
    include: {
      participants: {
        where: { wasLeft: false },
        select: { userId: true },
      },
    },
  });

  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const isOwner = room.ownerId === userId;
  const activeParticipants = room.participants.map((p) => p.userId);
  const isAlone = isOwner && activeParticipants.length === 1;

  if (isAlone) {
    await prisma.chatRoom.delete({ where: { id: roomId } });
    logger.info(
      `Room ${roomId} deleted by owner ${userId} (was last participant).`
    );
    return {
      roomId,
      userId,
      status: 'userQuit',
      roomStatus: 'deleted',
    };
  }
  if (isOwner) {
    logger.warn(
      `User ${userId} is the owner of room ${roomId} and cannot leave without deleting.`
    );
    return {
      roomId,
      userId,
      status: 'userIsOwner',
    };
  }

  await prisma.userStatusesInChat.update({
    where: {
      userId_roomId: { userId, roomId },
    },
    data: {
      wasLeft: true,
      leftAt: new Date(),
    },
  });

  const remaining = await prisma.userStatusesInChat.count({
    where: { roomId, wasLeft: false },
  });

  if (remaining === 0) {
    await prisma.chatRoom.delete({ where: { id: roomId } });
    logger.info(`Room ${roomId} is now empty and deleted.`);
    return {
      roomId,
      userId,
      status: 'userQuit',
      roomStatus: 'deleted',
    };
  }

  logger.info(`User ${userId} left room ${roomId}`);
  return {
    roomId,
    userId,
    status: 'userQuit',
  };
}

/**
 * Retrieves all chat rooms for a specific user, including participants and latest message.
 * @param {string} userId - The ID of the user whose chat rooms to retrieve.
 * @returns {Promise<Array<IChatRoom>>} An array of chat room objects.
 */
export async function getChatRoomsForUser(
  userId: string
): Promise<IChatRoom[]> {
  const userRooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: { userId: userId, wasLeft: false },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          siteRole: true,
          profile: { select: { avatar: true } },
        },
      },
      participants: {
        where: { wasLeft: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              siteRole: true,
              profile: { select: { avatar: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              siteRole: true,
              profile: { select: { avatar: true } },
            },
          },
          reactions: {
            select: { id: true, userId: true, reaction: true },
          },
        },
      },
    },
  });

  if (!userRooms || userRooms.length === 0) {
    logger.warn(`No chat rooms found for user ${userId}`);
    return [];
  }

  return userRooms.map((room) => ({
    id: room.id,
    ownerId: room.ownerId,
    name: room.name ?? '',
    description: room.description ?? '',
    createdAt:
      room.createdAt instanceof Date
        ? room.createdAt.toISOString()
        : room.createdAt,
    updatedAt:
      room.updatedAt instanceof Date
        ? room.updatedAt.toISOString()
        : room.updatedAt,
    owner: {
      id: room.owner.id,
      name: room.owner.name,
      siteRole: room.owner.siteRole as SiteRoleEnum,
      avatar: room.owner.profile?.avatar ?? undefined,
    },
    participants: room.participants.map((p) => ({
      userId: p.userId,
      roomId: p.roomId,
      wasLeft: p.wasLeft,
      leftAt: p.leftAt,
      joinedAt: p.joinedAt,
    })),
    messages: room.messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        siteRole: msg.sender.siteRole as SiteRoleEnum,
        avatar: msg.sender.profile?.avatar ?? undefined,
      },
      roomId: msg.roomId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt ? msg.updatedAt.toISOString() : undefined,
      reactions: msg.reactions.map((r) => ({
        reactionId: r.id.toString(),
        reaction: r.reaction,
        userId: r.userId,
      })),
    })),
  }));
}

/**
 * Retrieves messages from a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {string} userId - The ID of the user requesting the messages.
 * @param {number} limit - The maximum number of messages to retrieve.
 * @param {string} [cursor] - The ID of the last message to start from (for pagination).
 * @returns {Promise<{ messages: IChatMessage[]; nextCursor: string | null }>} An object containing the messages and the next cursor for pagination.
 */
export async function getMessagesForChatRoom(
  roomId: string,
  userId: string,
  limit = 20,
  cursor?: string
): Promise<{
  messages: IChatMessage[];
  nextCursor: string | null;
}> {
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: { userId: userId, wasLeft: false },
      },
    },
  });

  if (!room) {
    logger.warn(`User ${userId} is not allowed to access room ${roomId}`);
    throw new Error(
      `Chat room with ID ${roomId} not found or user ${userId} is not a participant.`
    );
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          siteRole: true,
          profile: { select: { avatar: true } },
        },
      },
      reactions: { select: { id: true, userId: true, reaction: true } },
    },
  });

  const hasMore = messages.length > limit;

  return {
    messages: messages.slice(0, limit).map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        siteRole: msg.sender.siteRole as SiteRoleEnum,
        avatar: msg.sender.profile?.avatar ?? undefined,
      },
      roomId: msg.roomId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt ? msg.updatedAt.toISOString() : undefined,
      reactions: msg.reactions.map((r) => ({
        reactionId: r.id.toString(),
        reaction: r.reaction,
        userId: r.userId,
      })),
    })),
    nextCursor: hasMore ? messages[limit].id : null,
  };
}

/**
 * Adds a user to a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {string} userId - The ID of the user to add.
 * @param {string} ownerId - The ID of the room owner.
 * @returns {Promise<IChatUserAdded>} An object indicating the addition status and user details.
 */
export async function addUserToChatRoom(
  roomId: string,
  userId: string,
  ownerId: string
): Promise<IChatUserAdded> {
  const existingRoom = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { participants: true, owner: true },
  });

  if (!existingRoom) {
    throw new Error(`Room ${roomId} not found.`);
  }

  if (existingRoom.ownerId !== ownerId) {
    throw new Error(`User ${ownerId} is not the owner of room ${roomId}.`);
  }

  const participant = existingRoom.participants.find(
    (p) => p.userId === userId
  );

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

  const mappedUser: IChatUser = {
    id: user.id,
    name: user.name,
    avatar: user.profile?.avatar ?? undefined,
    siteRole: user.siteRole as SiteRoleEnum,
  };

  if (participant && !participant.wasLeft) {
    logger.warn(`User ${userId} is already in room ${roomId}`);
    throw new Error(`User ${userId} is already in the room`);
  }

  if (participant && participant.wasLeft) {
    await prisma.userStatusesInChat.update({
      where: { userId_roomId: { userId, roomId } },
      data: {
        wasLeft: false,
        leftAt: null,
        joinedAt: new Date(),
      },
    });

    logger.info(`User ${userId} rejoined room ${roomId}`);
    return { roomId, user: mappedUser, status: 'reactivated' };
  }

  await prisma.userStatusesInChat.create({
    data: {
      userId,
      roomId,
      joinedAt: new Date(),
      wasLeft: false,
    },
  });

  logger.info(`User ${userId} added to room ${roomId}`);
  return { roomId, user: mappedUser, status: 'added' };
}

/**
 * Removes a user from a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {string} userId - The ID of the user to remove.
 * @param {string} ownerId - The ID of the room owner.
 * @returns {Promise<{ roomId: string; userId: string; status: 'removed' }>} An object indicating the removal status.
 */
export async function removeUserFromChatRoom(
  roomId: string,
  userId: string,
  ownerId: string
): Promise<{ roomId: string; userId: string; status: 'removed' }> {
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      ownerId,
      participants: {
        some: { userId, wasLeft: false },
      },
    },
  });

  if (!room) {
    throw new Error('Room not found or user not a valid participant');
  }

  await prisma.userStatusesInChat.update({
    where: {
      userId_roomId: {
        userId,
        roomId,
      },
    },
    data: {
      wasLeft: true,
      leftAt: new Date(),
    },
  });

  return { roomId, userId, status: 'removed' };
}
/**
 * Deletes a chat room by its ID.
 * @param {string} userId - The ID of the user requesting the deletion.
 * @param {string} roomId - The ID of the chat room to delete.
 * @returns {Promise<ChatRoom>} The deleted chat room object.
 */
export const deleteChatRoom = async (
  userId: string,
  roomId: string
): Promise<{ roomId: string; userId: string; status: 'deleted' }> => {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId, ownerId: userId },
  });
  if (!room || !room.ownerId) {
    throw new Error('Room not found or user not authorized to delete it');
  }

  await prisma.chatRoom.delete({
    where: { id: roomId, ownerId: userId },
  });

  logger.info(`Room ${roomId} deleted by user ${userId}`);
  return { roomId, userId, status: 'deleted' };
};
