import { Socket } from 'socket.io';
import logger from './logger';
interface ISocketAuth extends Socket {
  data: {
    userId?: string;
  };
}
export const ensureAuth = (
  event: string,
  socket: ISocketAuth,
  callback?: (res: { error: string }) => void
): string | null => {
  const userId = socket.data?.userId;

  if (!userId) {
    const message = `Unauthorized for ${event}`;
    logger.warn(`🔒 [${socket.id}] ${message}`);
    callback?.({ error: message });
    socket.emit('auth:error', { error: message });
    return null;
  }

  return userId;
};
