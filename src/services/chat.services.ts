import { prisma } from '@/services/prisma';
import { ChatRoom, UserStatusesInChat } from '@/types/chat.types';
import { User } from '@/types/user';
import logger from '@/utils/logger';

/**
 * Creates a new chat room with the specified participants.
 * @param {number} userId - The ID of the user creating the chat room.
 * @param {number[]} participantsIds - An array of participant user IDs.
 * @returns {Promise<ChatRoom>} The created chat room object.
 */
export async function createChatRoom(
  userId: number,
  participantsIds: number[] = []
): Promise<ChatRoom> {
  const allInvited = Array.from(new Set([...participantsIds, userId]));
  const users = await prisma.user.findMany({
    where: { id: { in: [userId, ...allInvited] } },
    select: { id: true },
  });
  const existingIds: number[] = users.map((u: { id: number }) => u.id);
  const room = await prisma.chatRoom.create({
    data: {
      ownerId: userId,
      name: `Chat ${new Date().toISOString()}`,
      description: '',
    },
  });

  await prisma.chatParticipant.createMany({
    data: existingIds.map((id) => ({
      userId: id,
      roomId: room.id,
    })),
    skipDuplicates: true,
  });

  const fullRoom = await prisma.chatRoom.findUnique({
    where: { id: room.id },
    include: {
      participants: true,
    },
  });

  logger.info(`New Chat Room Created: ${fullRoom.id}
    Participants: ${fullRoom.participants.map((p: User) => p.name).join(', ')}`);

  return {
    id: fullRoom.id,
    ownerId: fullRoom.ownerId,
    name: fullRoom.name,
    participants: fullRoom.participants.map((p: User) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      siteRole: p.siteRole,
    })),
    createdAt: fullRoom.createdAt,
    updatedAt: fullRoom.updatedAt,
  };
}

/**
 * Retrieves a chat room by its ID, including participants and the latest message.
 * @param {number} userId - The ID of the user requesting the chat room.
 * @param {string} roomId - The ID of the chat room to retrieve.
 * @returns {Promise<ChatRoom>} The chat room object with participants and latest message.
 */

export async function getChatRoomById(
  userId: number,
  roomId: string
): Promise<
  ChatRoom & {
    participants: { id: number; name: string }[];
    messages: { createdAt: Date }[];
  }
> {
  const participant = await prisma.userStatusesInChat.findFirst({
    where: {
      userId,
      roomId,
      wasLeft: false,
    },
    include: {
      room: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });

  const room = participant?.room;

  if (!room) {
    logger.warn(`User ${userId} is not allowed to access room ${roomId}`);
    throw new Error(`Chat room with ID ${roomId} not found or access denied.`);
  }

  return {
    ...room,
    participants: room.participants.map((p: any) =>
      p.user ? p.user : { id: p.id, name: p.name }
    ),
    messages: room.messages.map((m: any): { createdAt: any } => ({
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Deletes the current user from a chat room.
 * @param {number} userId - The ID of the user to remove.
 * @param {string} roomId - The ID of the chat room.
 * @returns {Promise<Object>} The updated chat room object or an error if the room is empty.
 */

export async function deleteMeFromChatRoom(
  userId: number,
  roomId: string
): Promise<ChatRoom> {
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
      participants: {
        where: { wasLeft: false },
        include: { user: true },
      },
    },
  });

  logger.info(`User ${userId} left room ${roomId}`);
  return room! as ChatRoom;
}

/**
 * Retrieves all chat rooms for a specific user, including participants and latest message.
 * @param {number} userId - The ID of the user whose chat rooms to retrieve.
 * @returns {Promise<Array<ChatRoom>>} An array of chat room objects.
 */

export async function getChatRoomsForUser(userId: number): Promise<ChatRoom[]> {
  const userRooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: { id: userId, wasLeft: false },
      },
    },
    include: {
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

  return userRooms;
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
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: { id: userId, wasLeft: false },
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
 * @returns {Promise<ChatRoom>} The updated chat room object.
 */

export async function addUserToChatRoom(
  roomId: string,
  userId: number,
  ownerId: number
): Promise<ChatRoom> {
  const existingRoom = await prisma.chatRoom.findUnique({
    where: {
      ownerId: ownerId,
      id: roomId,
      participants: {
        some: { ownerId, wasLeft: false },
      },
    },
  });

  const isParticipant = existingRoom?.participants.some(
    (participant: UserStatusesInChat) =>
      participant.userId === userId && !participant.wasLeft
  );

  if (isParticipant) {
    logger.warn(`User ${userId} is already at the room ${roomId}`);
    throw new Error(`User ${userId} is already at the room ${roomId}`);
  }

  const room = await prisma.chatRoom.update({
    where: { id: roomId },
    data: {
      participants: {
        create: {
          userId,
          joinedAt: new Date(),
        },
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
    },
  });

  logger.info(`User ${userId} added to room ${roomId}`);
  return room;
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
): Promise<ChatRoom> {
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

  return room;
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
): Promise<ChatRoom> => {
  const room = await prisma.chatRoom.delete({
    where: { id: roomId, ownerId: userId },
  });
  return room;
};
