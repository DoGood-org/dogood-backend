// src/socket.ts
import { Server } from 'socket.io';
import logger from './logger';

let io: Server;

export const setIO = (server: Server) => {
  io = server;
};

export const getIO = (): Server => {
  logger.info(' Socket.IO instance accessed');

  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
