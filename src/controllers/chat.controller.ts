import logger from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';
import * as chatService from '@/services/chat.services';
import { getIO } from '@/utils/socketHandler';


export const createNewChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { participantsIds } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const room = await chatService.createChatRoom(userId, participantsIds);
    logger.info('Chat room created successfully', { roomId: room.id });
    return res.status(201).json(room);
  } catch (error) {
    logger.error('Error creating chat room', { error });
    return next(error);
  }
};
export const getChatRoomViaId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const room = await chatService.getChatRoomById(userId, roomId);
    logger.info('Chat room retrieved successfully', { roomId: room.id });
    return res.json(room);
  } catch (error) {
    logger.error('Error retrieving chat room', { error });
    return next(error);
  }
};
export const deleteMeFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const deletedRoom = await chatService.deleteMeFromChatRoom(userId, roomId);
    logger.info('User removed from chat room', { roomId: deletedRoom.id });
    return res.json(deletedRoom);
  } catch (error) {
    logger.error('Error removing user from chat room', { error });
    return next(error);
  }
};
export const getChatRoomsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const rooms = await chatService.getChatRoomsForUser(userId);
    logger.info('Chat rooms retrieved successfully', { userId });
    return res.json(rooms);
  } catch (error) {
    logger.error('Error retrieving chat rooms', { error });
    return next(error);
  }
};

export const getMessagesForRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const messages = await chatService.getMessagesForChatRoom(roomId, userId);
    logger.info('Messages retrieved successfully', { roomId });
    return res.json(messages);
  } catch (error) {
    logger.error('Error retrieving messages', { error });
    return next(error);
  }
};
export const addUserToChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomId, userId } = req.params;
    const updatedRoom = await chatService.addUserToChatRoom(roomId, parseInt(userId, 10));
    logger.info('User added to chat room successfully', { roomId, userId });
    return res.json(updatedRoom);
  } catch (error) {
    logger.error('Error adding user to chat room', { error });
    return next(error);
  }
};

export const removeUserFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomId, userId } = req.params;
    const updatedRoom = await chatService.removeUserFromChatRoom(roomId, parseInt(userId, 10));
    logger.info('User removed from chat room successfully', { roomId, userId });
    return res.json(updatedRoom);
  } catch (error) {
    logger.error('Error removing user from chat room', { error });
    return next(error);
  }
};

export const sendMessageToChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const roomId = req.params.roomId;
    const { content } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const message = await chatService.sendMessage(roomId, { content, userId });
    const io = getIO();
    io.to(roomId).emit('newMessage', message);
    logger.info('Message sent to chat room successfully', { roomId, userId });
    return res.json(message);
  } catch (error) {
    logger.error('Error sending message to chat room', { error });
    return next(error);
  }
};

export const deleteMessageFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const deletedMessage = await chatService.deleteMessage(userId, messageId);
    logger.info('Message deleted successfully', { messageId });
    return res.json(deletedMessage);
  } catch (error) {
    logger.error('Error deleting message', { error });
    return next(error);
  }
};

export const editMessageInChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const updatedMessage = await chatService.editMessage(userId, messageId, req.body.content);
    logger.info('Message edited successfully', { messageId });
    return res.json(updatedMessage);
  } catch (error) {
    logger.error('Error editing message', { error });
    return next(error);
  }
};