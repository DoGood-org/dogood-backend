import { SiteRoleEnum } from '@/types/user.types';
import { prisma } from '@/services/prisma';
import { IChatRoom, IChatUser,  IUserStatusesInChat } from '@/types/chat.types';
import logger from '@/utils/logger';
import { ChatMessage } from '@prisma/client';

/**
 * Creates a new chat room with the specified participants.
 * @param userId - The ID of the user creating the chat room.
 * @param participantsIds - An array of participant user IDs.
 * @returns The created chat room object.
 */
export async function createChatRoom(
  userId: IChatUser['id'],
  participantsIds: IChatUser['id'][]
): Promise<IChatRoom> {
  const allInvited = Array.from(new Set([...participantsIds, userId]));
  const users = await prisma.user.findMany({
    where: { id: { in: [userId, ...allInvited] } },
    select: { id: true },
  });
  const existingIds: IChatUser['id'][] = users.map((u: { id: IChatUser['id'] }) => u.id);
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
    })), skipDuplicates: true,
  });

  const roomWithUsers = await prisma.chatRoom.findUnique({
    where: { id: newRoom.id },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatar: true, siteRole: true } } },
      },
      owner: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          sender: { select: { id: true, name: true, avatar: true, siteRole: true } },
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
    participants: roomWithUsers.participants.map((p: any) => ({
      ...p,
    })) as IUserStatusesInChat[],
    owner: {
      ...roomWithUsers.owner,
      siteRole: roomWithUsers.owner.siteRole as SiteRoleEnum,
      avatar: roomWithUsers.owner.avatar ?? undefined,
    },
    messages: roomWithUsers.messages.map((msg: any) => ({
      ...msg,
      sender: {
        ...msg.sender,
        avatar: msg.sender.avatar ?? undefined,
      },
    })),
    createdAt: roomWithUsers.createdAt.toISOString(),
    updatedAt: roomWithUsers.updatedAt.toISOString(),
  };
}

/**
 * Retrieves a chat room by its ID, including participants and the latest message.
 * @param {number} userId - The ID of the user requesting the chat room.
 * @param {string} roomId - The ID of the chat room to retrieve.
 * @returns {Promise<IChatRoom>} The chat room object with participants and latest message.
 */

export async function getChatRoomById(
  userId: number,
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
          owner: { select: { id: true, name: true, avatar: true, siteRole: true } },
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { createdAt: true, sender: { select: { id: true, name: true, avatar: true } } },
          },
        
        },
      },
    },
  });


  if (!userStatusInTheRoom) {
    logger.warn(`User ${userId} is not allowed to access room ${roomId}`);
    throw new Error(`Chat room with ID ${roomId} not found or access denied.`);
  }

  return {
    id: userStatusInTheRoom.room.id,
    ownerId: userStatusInTheRoom.room.ownerId,
    name: userStatusInTheRoom.room.name ?? '',
    description: userStatusInTheRoom.room.description ?? '',
    owner: {
      id: userStatusInTheRoom.room.owner?.id ?? 0,
      name: userStatusInTheRoom.room.owner?.name ?? '',
      avatar: userStatusInTheRoom.room.owner?.avatar ?? undefined,
      siteRole: userStatusInTheRoom.room.owner?.siteRole as SiteRoleEnum ?? SiteRoleEnum.USER,
    },
    participants: userStatusInTheRoom.room.participants.map((p: any) =>
      p.user ? {
        ...p.user,
        avatar: p.user.avatar ?? undefined,
      } : { id: p.id, name: p.name }
    ),
    messages: userStatusInTheRoom.room.messages.map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      sender: m.sender,
      roomId: m.roomId,
      content: m.content,
      createdAt: m.createdAt,
    })),
    createdAt: userStatusInTheRoom.room.createdAt instanceof Date ? userStatusInTheRoom.room.createdAt.toISOString() : userStatusInTheRoom.room.createdAt,
    updatedAt: userStatusInTheRoom.room.updatedAt instanceof Date ? userStatusInTheRoom.room.updatedAt.toISOString() : userStatusInTheRoom.room.updatedAt,
  };
}

/**
 * Deletes the current user from a chat room.
 * @param userId - The ID of the user to remove.
 * @param roomId - The ID of the chat room.
 * @returns The updated chat room object after the user has been removed or unknown
 */
export async function deleteMeFromChatRoom(
  userId: number,
  roomId: string
): Promise<IChatRoom> {
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

  const remaining = await prisma.userStatusesInChat.count({
    where: {
      roomId,
      wasLeft: false,
    },
  });

  if (remaining === 0) {
    await prisma.chatRoom.delete({ where: { id: roomId } });
    logger.info(`Room ${roomId} is empty and deleted.`);
    throw new Error(`Room ${roomId} was deleted (no participants remain).`);
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatar: true,
          siteRole: true,
        },
      },
      participants: {
        where: { wasLeft: false },
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
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Optional: last message
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              siteRole: true,
            },
          },
          reactions: true,
        },
      },
    },
  });

  logger.info(`User ${userId} left room ${roomId}`);
  if (!room) {
    logger.warn(`Room ${roomId} not found after user left.`);
  }
  return room as unknown as IChatRoom;
}
/**
 * Retrieves all chat rooms for a specific user, including participants and latest message.
 * @param {number} userId - The ID of the user whose chat rooms to retrieve.
 * @returns {Promise<Array<ChatRoom>>} An array of chat room objects.
 */
export async function getChatRoomsForUser(userId: IChatUser['id']): Promise<IChatRoom[]> {
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
          avatar: true,
          siteRole: true,
        },
      },
      participants: {
        where: { wasLeft: false },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { createdAt: true },
      },
    },
  });

  if (!userRooms || userRooms.length === 0) {
    logger.warn(`No chat rooms found for user ${userId}`);
    return [];
  }

  return userRooms.map((room) => ({
    ...room,
    name: room.name ?? '',
    description: room.description ?? '',
    owner: {
      ...room.owner,
      avatar: room.owner.avatar ?? undefined,
      siteRole: room.owner.siteRole as SiteRoleEnum,
    },
    participants: room.participants.map((p: any) => ({
      ...p,
      user: p.user ? { ...p.user, avatar: p.user.avatar ?? undefined } : undefined,
    })),
    messages: room.messages.map((msg: any) => ({
      ...msg,
    })),
  }));
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
): Promise<{
  messages: ChatMessage[];
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
      sender: { select: { id: true, name: true, avatar: true } },
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
 * @param {number} ownerId - The ID of the room owner.
 * @returns {Promise<IChatRoom>} The updated chat room object.
 */

export async function addUserToChatRoom(
  roomId: string,
  userId: number,
  ownerId: number
): Promise<IChatRoom> {
  const existingRoom = await prisma.chatRoom.findUnique({
    where: {
      id: roomId,
      ownerId: ownerId,
    },
    include: {
      participants: true,
    },
  });

  const isParticipant = existingRoom?.participants.some(
    (participant: IUserStatusesInChat ) =>
      participant.userId === userId && !participant.wasLeft
  );

  if (isParticipant) {
    logger.warn(`User ${userId} is already at the room ${roomId}`);
    throw new Error(`User ${userId} is already at the room ${roomId}`);
  }

  await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      participants: {
        create: {
          userId,
          joinedAt: new Date(),
        },
      },
    },
  });

  const fullRoom = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatar: true,
          siteRole: true,
        },
      },
      participants: {
        include: { user: { select: { id: true, name: true, avatar: true, siteRole: true } } },
        where: { wasLeft: false },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          sender: { select: { id: true, name: true, avatar: true, siteRole: true } },
        },
      },
    },
  });

  logger.info(`User ${userId} added to room ${roomId}`);
  if (!fullRoom) {
    throw new Error('Room not found after adding user');
  }
  return {
    id: fullRoom.id,
    ownerId: fullRoom.ownerId,
    name: fullRoom.name ?? '',
    description: fullRoom.description ?? '',
    owner: {
      ...fullRoom.owner,
      siteRole: fullRoom.owner.siteRole as SiteRoleEnum,
      avatar: fullRoom.owner.avatar ?? undefined,
    },
    participants: fullRoom.participants.map((p: any) => ({
      ...p,
      user: p.user ? { ...p.user, avatar: p.user.avatar ?? undefined } : undefined,
    })),
    messages: fullRoom.messages.map((msg: any) => ({
      ...msg,
      sender: {
        ...msg.sender,
        avatar: msg.sender.avatar ?? undefined,
      },
    })),
    createdAt: fullRoom.createdAt.toISOString(),
    updatedAt: fullRoom.updatedAt.toISOString(),
  };
}

/**
 * Removes a user from a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {number} userId - The ID of the user to remove.
 * @param {number} ownerId - The ID of the room owner.
 * @returns {Promise<ChatRoom>} The updated chat room object.
 */
export async function removeUserFromChatRoom(
  roomId: string,
  userId: number,
  ownerId: number
): Promise<{ roomId: string; userId: number; status: 'removed' }> {
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
 * @param {number} userId - The ID of the user requesting the deletion.
 * @param {string} roomId - The ID of the chat room to delete.
 * @returns {Promise<ChatRoom>} The deleted chat room object.
 */
export const deleteChatRoom = async (
  userId: number,
  roomId: string
): Promise<{ roomId: string, userId: number , status: 'deleted' }> => {

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
