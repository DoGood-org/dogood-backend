import { Socket } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import logger from '@/utils/logger';

const { JsonWebTokenError, TokenExpiredError } = jwt;

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      return next();
    }

    const cookies = cookie.parse(cookieHeader);
    const token = cookies.accessToken;

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string };

    socket.data.userId = decoded.id;

    next();
  } catch (err: unknown) {
    let errorMessage = 'Unknown error';

    if (err instanceof TokenExpiredError) {
      errorMessage = 'Token expired';
    } else if (err instanceof JsonWebTokenError) {
      errorMessage = 'Invalid token';
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    logger.warn(`⚠️ Socket auth fallback to guest: ${socket.id} (${errorMessage})`);
    next();
  }
};