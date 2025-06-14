import { prisma } from '@/services/prisma';
/**
 * Creates a new chat room in the database.
 * @returns {Promise<Object>} The created chat room object.
 */
export default async function createChatRoom() {
  const room = await prisma.chatRoom.create({ data: {} });
  return room;
}

/**
 * Retrieves a chat room by its ID.
 * @param {string} roomId - The ID of the chat room to retrieve.
 * @returns {Promise<Object|null>} The chat room object or null if not found.
 */
export async function getChatRoomById(roomId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
  });
  return room;
}


/**
 * Deletes a chat room by its ID.
 * @param {string} roomId - The ID of the chat room to delete.
 * @returns {Promise<Object>} The deleted chat room object.
 */
export async function deleteChatRoom(roomId: string) {
    const room = await prisma.chatRoom.delete({
      where: { id: roomId },
    });
    return room;
  }
  
/**
 * Retrieves all chat rooms for a user.
 * @param {number} userId - The ID of the user whose chat rooms to retrieve.
 * @returns {Promise<Array<Object>>} An array of chat room objects.
 */
export async function getChatRoomsForUser(userId: number) {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        some: {
          id: userId,
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
export async function getMessagesForChatRoom(roomId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { roomId: roomId },
    include: {
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return messages;
}

/**
 * Adds a user to a chat room.
 * @param {string} roomId - The ID of the chat room.
 * @param {number} userId - The ID of the user to add.
 * @returns {Promise<Object>} The updated chat room object.
 */
export async function addUserToChatRoom(roomId: string, userId: number) {
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
    where: { id: roomId },
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
export async function sendMessage(roomId: string, message: { content: string; senderId: number }) {
  const newMessage = await prisma.chatMessage.create({
    data: {
      content: message.content,
      senderId: message.senderId,
      roomId: roomId,
    },
  });
  return newMessage;
}


/**
 * Deletes a message by its ID.
 * @param {string} messageId - The ID of the message to delete.
 * @returns {Promise<Object>} The deleted message object.
 */
export async function deleteMessage(messageId: string) {
  const message = await prisma.chatMessage.delete({
    where: { id: messageId },
  });
  return message;
}

/**
 * Edits a message by its ID.
 * @param {string} messageId - The ID of the message to edit.
 * @param {string} content - The new content for the message.
 * @returns {Promise<Object>} The updated message object.
 */
export async function editMessage(messageId: string, content: string) {
  const updatedMessage = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content: content },
  });
  return updatedMessage;
}

