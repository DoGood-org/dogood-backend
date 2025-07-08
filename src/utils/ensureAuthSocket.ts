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
): number | null => {
  const rawUserId = socket.data?.userId;

  const userId =
    typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;

  if (!userId || isNaN(userId)) {
    const message = `Unauthorized for ${event}`;
    logger.warn(`🔒 [${socket.id}] ${message}`);
    callback?.({ error: message });
    socket.emit('auth:error', { error: message });
    return null;
  }

  return userId;
};
