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
  deleteMeFromChatRoom,
} from '../../controllers/chat.controller';
import { validateBody, validateParams } from '@/middlewares/chat.middleware';
import { ChatSchemas } from '@/schemas/chat.schema';
import { Request, Response, NextFunction } from 'express';

import { getIO } from '@/utils/socketHandler';
import { verifyToken } from '@/middlewares';



const chatRoute = Router();
chatRoute.use(verifyToken);





// Chat routes
// curl http://localhost:3001/chat/invalid-id
// curl http://localhost:3001/chat/rooms/user/1
/** manage a chat room */
chatRoute.post(
  '/new',
  validateBody(ChatSchemas.createChatRoomBody),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, participantsIds } = req.body;
      const room = await createChatRoom(userId, participantsIds);
      res.status(201).json(room);
    } catch (error) {
      next(error);
    }
  }
);

chatRoute.get(
  '/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const room = await getChatRoomById(userId, roomId);
    res.json(room);
  }
);


chatRoute.delete(
  '/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const deletedRoom = await deleteMeFromChatRoom(userId, roomId);
    res.json(deletedRoom);
  }
);
chatRoute.get('/rooms/:userId',
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
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const messages = await getMessagesForChatRoom(roomId, userId);
    res.json(messages);
  }
);

/**Chat with others**/

chatRoute.post(
  '/:roomId/invite/:userId',
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
  '/:roomId/user/:userId',
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
  '/:roomId/messages',
  validateParams(ChatSchemas.roomIdParam),
  validateBody(ChatSchemas.messageBody),
  async (req, res) => {
    const { roomId } = req.params;
    const { content } = req.body;
    const senderId = req.user && req.user.id;
    if (!senderId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const message = await sendMessage(roomId, { content, senderId });
    const io = getIO();

    io.to(roomId).emit('newMessage', message);
  

    res.status(201).json(message);
  }
);

chatRoute.put(
  '/:messageId',
  validateParams(ChatSchemas.messageIdParam),
  validateBody(ChatSchemas.editMessageBody),
  async (req, res) => {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not found in request' });
    }
    const updated = await editMessage(userId, req.params.messageId, req.body.content);
    const io = getIO();
    io.emit('messageEdited', updated);
    res.json(updated);
  }
);
chatRoute.delete(
  '/chat/message/:id',
  validateParams(ChatSchemas.messageIdParam),
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = req.params.id;

    const deleted = await deleteMessage(userId, messageId);
    const io = getIO();
    io.to(deleted.roomId).emit('messageDeleted', { id: messageId });

    res.json(deleted);
  }
);


export { chatRoute };