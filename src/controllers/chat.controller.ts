import * as chatService from '@/services/chat.services';
import { IChatRoom } from '@/types/chat.types';
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
    const newChatRoom: IChatRoom = await chatService.createChatRoom(
      userId,
      participantsIds
    );

    getIO().emit('chatRoomCreated', newChatRoom);
    logger.info('Chat room created successfully', { id: newChatRoom.id });
    return res.status(201).json({ message: 'New room created', room: newChatRoom });
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
    logger.info('Chat room found successfully', { roomId: room.id });
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
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }

    const result = await chatService.deleteMeFromChatRoom(userId, roomId);

    if (result.status === 'userIsOwner') {
      logger.warn('Owner attempted to leave the room without deleting it', {
        roomId,
        userId,
      });
      return res.status(403).json({
        message: 'Room owners must delete the room instead of leaving it.',
        ...result,
      });
    }

    getIO().emit('UserLeftRoom', { userId, roomId });

    if (result.roomStatus === 'deleted') {
      getIO().emit('NoOneLeftInTheRoom', { roomId });
      logger.info('Chat room deleted due to no participants', { roomId });

      return res.status(200).json({
        message: 'You have left the chat room and it has been deleted.',
        ...result,
      });
    }

    logger.info('User left the chat room', { roomId, userId });
    return res.status(200).json({
      message: 'You have left the chat room.',
      ...result,
    });
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
    const currentUserId = req.user && req.user.id;
    if (!currentUserId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }

    const updatedRoom = await chatService.addUserToChatRoom(
      roomId,
      parseInt(userId, 10),
      currentUserId
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
    const currentUserId = req.user && req.user.id;
    if (!currentUserId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized: user not found in request' });
    }
    const { roomId, userId } = req.params;
    const updatedRoom = await chatService.removeUserFromChatRoom(
      roomId,
      parseInt(userId, 10),
      currentUserId
    );
    logger.info('User removed from chat room successfully', { roomId, userId });
    return res.json(updatedRoom);
  } catch (error) {
    logger.error('Error removing user from chat room', { error });
    return next(error);
  }
};
