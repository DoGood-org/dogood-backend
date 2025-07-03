import * as ChatController from '@/controllers/chat.controller';

import { Router } from 'express';

import { validateParams } from '@/middlewares/chat.middleware';
import { ChatSchemas } from '@/schemas/chat.schema';

import { validateBody, verifyToken } from '@/middlewares';

const chatRoute = Router();
chatRoute.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat management API
 */
/** manage a chat room */
chatRoute.post(
  '/new',
  validateBody(ChatSchemas.createChatRoomBody),

  ChatController.createNewChatRoom
);

chatRoute.get(
  '/room/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  ChatController.getChatRoomViaId
);
chatRoute.delete(
  '/quit/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  ChatController.deleteMeFromChatRoom
);

chatRoute.get('/rooms', ChatController.getChatRoomsForUser);

chatRoute.get(
  '/messages/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  ChatController.getMessagesForRoom
);

/** Invites a user to a chat room. */
chatRoute.post(
  '/invite/:roomId/:userId',
  validateParams(ChatSchemas.addUserToChatRoomParam),
  ChatController.addUserToChatRoom
);
// **Kicks a user from a chat room. */
chatRoute.delete(
  '/kick/:roomId/:userId',
  validateParams(ChatSchemas.removeUserFromChatRoomParam),
  ChatController.removeUserFromChatRoom
);

export { chatRoute };
