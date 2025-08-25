import { chatControllers } from '@/controllers/chat.controller';

import { Router } from 'express';

import { validateParams } from '@/middlewares/chat.middleware';
import { ChatSchemas } from '@/schemas/chat.schema';

import { authenticateUser, validateBody } from '@/middlewares';

const chatRoute = Router();
chatRoute.use(authenticateUser);

chatRoute.post(
  '/new',
  validateBody(ChatSchemas.createChatRoomBody),

  chatControllers.createNewChatRoom
);

chatRoute.get(
  '/room/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  chatControllers.getChatRoomViaId
);
chatRoute.delete(
  '/quit/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  chatControllers.deleteMeFromChatRoom
);

chatRoute.get('/rooms', chatControllers.getChatRoomsForUser);

chatRoute.get(
  '/messages/:roomId',
  validateParams(ChatSchemas.roomIdParam),
  chatControllers.getMessagesForRoom
);

/** Invites a user to a chat room. */
chatRoute.post(
  '/invite/:roomId/:userId',
  validateParams(ChatSchemas.addUserToChatRoomParam),
  chatControllers.addUserToChatRoom
);
// **Kicks a user from a chat room. */
chatRoute.delete(
  '/kick/:roomId/:userId',
  validateParams(ChatSchemas.removeUserFromChatRoomParam),
  chatControllers.removeUserFromChatRoom
);

export { chatRoute };
