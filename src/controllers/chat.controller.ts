import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import * as chatService from '@/services/chat.services';
import { IChatRoom } from '@/types/chat.types';
import logger from '@/utils/logger';
import { getIO } from '@/utils/socketHandler';
import { SuccessCode, ErrorCode } from '@/constants/apiCodes';
import { httpError } from '@/helpers/httpError';

/* ================= CREATE ROOM ================= */

const createNewChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { participantsIds } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const newChatRoom: IChatRoom = await chatService.createChatRoom(
    userId,
    participantsIds
  );

  getIO().emit('chatRoomCreated', newChatRoom);
  logger.info('Chat room created successfully', { id: newChatRoom.id });

  return res.status(201).json({
    status: 'success',
    code: SuccessCode.CHAT_ROOM_CREATED,
    message: 'Chat room created successfully',
    data: { room: newChatRoom },
  });
};

/* ================= GET ROOM BY ID ================= */

const getChatRoomViaId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const room = await chatService.getChatRoomById(userId, roomId);

  if (!room) {
    logger.warn('Chat room not found', { roomId });
    return next(
      httpError(404, 'Chat room not found', ErrorCode.CHAT_ROOM_NOT_FOUND)
    );
  }

  logger.info('Chat room found successfully', { roomId: room.id });

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_ROOM_RETRIEVED,
    message: 'Chat room retrieved successfully',
    data: { room },
  });
};

/* ================= DELETE ME FROM ROOM ================= */

const deleteMeFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const result = await chatService.deleteMeFromChatRoom(userId, roomId);

  if (result.status === 'userIsOwner') {
    logger.warn('Owner attempted to leave the room', { roomId, userId });
    return res.status(403).json({
      status: 'error',
      code: ErrorCode.CHAT_ACCESS_DENIED,
      message: 'Room owners must delete the room instead of leaving it.',
      data: result,
    });
  }

  getIO().emit('UserLeftRoom', { userId, roomId });

  if (result.roomStatus === 'deleted') {
    getIO().emit('NoOneLeftInTheRoom', { roomId });

    return res.status(200).json({
      status: 'success',
      code: SuccessCode.CHAT_ROOM_DELETED,
      message: 'You left the room and it was deleted.',
      data: result,
    });
  }

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_USER_REMOVED,
    message: 'You have left the chat room.',
    data: result,
  });
};

/* ================= GET USER ROOMS ================= */

const getChatRoomsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const rooms = await chatService.getChatRoomsForUser(userId);

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_ROOMS_RETRIEVED,
    message: 'Chat rooms retrieved successfully',
    data: { rooms },
  });
};

/* ================= GET MESSAGES ================= */

const getMessagesForRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const messages = await chatService.getMessagesForChatRoom(roomId, userId);

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_MESSAGES_RETRIEVED,
    message: 'Messages retrieved successfully',
    data: { messages },
  });
};

/* ================= ADD USER ================= */

const addUserToChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { roomId, userId } = req.params;
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const { user, status } = await chatService.addUserToChatRoom(
    roomId,
    userId,
    currentUserId
  );

  getIO().emit('UserAddedToRoom', { roomId, user, status });

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_USER_ADDED,
    message: 'User added to chat room',
    data: { roomId, user, status },
  });
};

/* ================= REMOVE USER ================= */

const removeUserFromChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const { roomId, userId } = req.params;

  const updatedRoom = await chatService.removeUserFromChatRoom(
    roomId,
    userId,
    currentUserId
  );

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.CHAT_USER_REMOVED,
    message: 'User removed from chat room successfully',
    data: { room: updatedRoom },
  });
};

/* ================= EXPORT ================= */

export const chatControllers = {
  createNewChatRoom: asyncHandler(createNewChatRoom),
  getChatRoomViaId: asyncHandler(getChatRoomViaId),
  deleteMeFromChatRoom: asyncHandler(deleteMeFromChatRoom),
  getChatRoomsForUser: asyncHandler(getChatRoomsForUser),
  getMessagesForRoom: asyncHandler(getMessagesForRoom),
  addUserToChatRoom: asyncHandler(addUserToChatRoom),
  removeUserFromChatRoom: asyncHandler(removeUserFromChatRoom),
};
