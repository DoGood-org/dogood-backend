import * as chatSocketsService from '@/services/chatSocket.service';
import { getIO } from '@/utils/socketHandler';

// export const sendMessageToChatRoom = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const roomId = req.params.roomId;
//     const { content } = req.body;
//     const userId = req.user && req.user.id;
//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized: user not found in request' });
//     }
//     const message = await chatService.sendMessage(roomId, { content, userId });
//     const io = getIO();
//     io.to(roomId).emit('newMessage', message);
//     logger.info('Message sent to chat room successfully', { roomId, userId });
//     return res.json(message);
//   } catch (error) {
//     logger.error('Error sending message to chat room', { error });
//     return next(error);
//   }
// };
// 
// export const deleteMessageFromChatRoom = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { messageId } = req.params;
//     const userId = req.user && req.user.id;
//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized: user not found in request' });
//     }
//     const deletedMessage = await chatService.deleteMessage(userId, messageId);
//     logger.info('Message deleted successfully', { messageId });
//     return res.json(deletedMessage);
//   } catch (error) {
//     logger.error('Error deleting message', { error });
//     return next(error);
//   }
// };
// 
// export const editMessageInChatRoom = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { messageId } = req.params;
//     const userId = req.user && req.user.id;
//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized: user not found in request' });
//     }
//     const updatedMessage = await chatService.editMessage(userId, messageId, req.body.content);
//     logger.info('Message edited successfully', { messageId });
//     return res.json(updatedMessage);
//   } catch (error) {
//     logger.error('Error editing message', { error });
//     return next(error);
//   }
// };