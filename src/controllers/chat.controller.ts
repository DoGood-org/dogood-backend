import * as chatService from '@/services/chat.services';
import { ChatRoom } from '@/types/common.types';
import logger from '@/utils/logger';
import { getIO } from '@/utils/socketHandler';
import { NextFunction, Request, Response } from 'express';

export const createNewChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { participantsIds } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }
    const newChatRoom: ChatRoom = await chatService.createChatRoom(
      userId,
      participantsIds
    );

    getIO().emit('chatRoomCreated', newChatRoom);
    logger.info('Chat room created successfully', { id: newChatRoom.id });
    return res.status(201).json(newChatRoom);
  } catch (error) {
    logger.error('Error creating chat room', { error });
    next(error);
    return;
  }
};
export const getChatRoomViaId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }
    const room = await chatService.getChatRoomById(userId, roomId);

    if (!room) {
      logger.warn('Chat room not found', { roomId });
      return res.status(404).json({ error: 'Chat room not found' });
    }
    logger.info('Chat room retrieved successfully', { roomId: room.id });
    return res.json(room);
  } catch (error) {
    logger.error('Error retrieving chat room', { error });
    next(error);
    return;
  }
};
export const deleteMeFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }
    const deletedRoom = await chatService.deleteMeFromChatRoom(userId, roomId);
    getIO().emit('userLeftRoom', { userId, roomId });
    if (deletedRoom.participants.length === 0) {
      getIO().emit('chatRoomDeleted', { roomId });
      logger.info('Chat room deleted due to no participants', { roomId });
      return res.status(204).send('Chat room deleted due to no participants');
    }

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
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
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
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
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
    const updatedRoom = await chatService.addUserToChatRoom(
      roomId,
      parseInt(userId, 10)
    );
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
    const updatedRoom = await chatService.removeUserFromChatRoom(
      roomId,
      parseInt(userId, 10)
    );
    logger.info('User removed from chat room successfully', { roomId, userId });
    return res.json(updatedRoom);
  } catch (error) {
    logger.error('Error removing user from chat room', { error });
    return next(error);
  }
};
