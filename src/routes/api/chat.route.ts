import { Router } from 'express';


import createChatRoom, {
  getChatRoomById,
  getChatRoomsForUser,
  addUserToChatRoom,
  removeUserFromChatRoom,
  sendMessage,
  editMessage,
  deleteMessage,
  getMessagesForChatRoom,
  deleteChatRoom,
} from '../../controllers/chat.controller';
import { validateBody, validateParams } from '@/middlewares/chat.middleware';
import { ChatSchemas } from '@/schemas/chat.schema';
import { Request, Response } from 'express';

const chatRoute = Router();

// Chat routes

/** manage a chat room */
chatRoute.post('/chat', createChatRoom);
chatRoute.get(
  '/chat/:id',
  validateParams(ChatSchemas.roomIdParam),
  async (req, res) => {
    const roomId = req.params.id;
    const room = await getChatRoomById(roomId);
    res.json(room);
  }
);


chatRoute.delete(
  '/chat/:id',
  validateParams(ChatSchemas.roomIdParam),
  async (req, res) => {
    const roomId = req.params.id;
    const deletedRoom = await deleteChatRoom(roomId);
    res.json(deletedRoom);
  }
);
chatRoute.get(
  '/rooms/user/:userId',
  validateParams(ChatSchemas.userIdParam),
  async (req, res) => {
    const userId = parseInt(req.params.userId, 10); 
    const rooms = await getChatRoomsForUser(userId);
    res.json(rooms);
  }
);


chatRoute.get(
  '/chat/:roomId/messages',
  validateParams(ChatSchemas.roomIdParam),
  async (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const messages = await getMessagesForChatRoom(roomId);
    res.json(messages);
  }
);

/**Chat with others**/

chatRoute.post(
  '/chat/:id/user/:userId',
  validateParams(ChatSchemas.roomIdParam),
  validateParams(ChatSchemas.userIdParam),
  async (req, res, next) => {
    try {
      const { id: roomId, userId } = req.params;
      const room = await addUserToChatRoom(roomId, parseInt(userId, 10));
      res.json(room);
    } catch (error) {
      next(error);
    }
  }
);
chatRoute.delete(
  '/chat/:id/user/:userId',
  validateParams(ChatSchemas.roomIdParam),
  validateParams(ChatSchemas.userIdParam),
  async (req, res, next) => {
    try {
      const { id: roomId, userId } = req.params;
      const room = await removeUserFromChatRoom(roomId, parseInt(userId, 10));
      res.json(room);
    } catch (error) {
      next(error);
    }
  }
);

chatRoute.post(
  '/rooms/:roomId/messages',
  validateParams(ChatSchemas.roomIdParam),
  validateBody(ChatSchemas.messageBody),
  async (req, res) => {
    const { roomId } = req.params;
    const { content, senderId } = req.body;
    const message = await sendMessage(roomId, { content, senderId });
    res.status(201).json(message);
  }
);

chatRoute.put(
  '/messages/:messageId',
  validateParams(ChatSchemas.messageIdParam),
  validateBody(ChatSchemas.editMessageBody),
  async (req, res) => {
    const updated = await editMessage(req.params.messageId, req.body.content);
    res.json(updated);
  }
);
chatRoute.delete(
  '/chat/message/:id',
  validateParams(ChatSchemas.messageIdParam),
  async (req, res) => {
    const deleted = await deleteMessage(req.params.id);
    res.json(deleted);
  }
);
