import { Socket } from 'socket.io';
import logger from './logger';
interface ISocketAuth extends Socket {
  data: {
    userId?: string;
  };
}
export const ensureAuth = (
  event: string,
  socket: ISocketAuth
): number | null => {
  const getUserId = () => socket.data?.userId;
  const userId = getUserId();
  if (!userId) {
    socket.emit('error', `Unauthorized for ${event}`);
    logger.warn(`Unauthorized socket ${socket.id} tried ${event}`);
    return null;
  }
  return Number(userId);
};
