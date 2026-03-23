// src/socket/socketHandler.ts
import { Server } from 'socket.io';
import logger from '../utils/logger';

let ioInstance: Server | null = null;

export const setIO = (server: Server) => {
  ioInstance = server;
};

export const getIO = (): Server => {

  if (!ioInstance) {
    logger.error('🔴  Socket.IO instance not initialized');
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};
