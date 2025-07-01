// utils/validateSocketData.ts
import { ZodSchema } from 'zod';
import { Socket } from 'socket.io';
import logger from '@/utils/logger';


export function validateSocketData<T>(
  schema: ZodSchema<T>,
  data: unknown,
  socket: Socket,
  errorTaskName: string 
): { success: true; data: T } | { success: false } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const messages = result.error.errors.map((err) => err.message);
    logger.warn(`🔶 [${socket.id}] Validation failed`, { errors: messages });
    socket.emit(errorTaskName, { errors: messages });
    return { success: false };
  }

  return { success: true, data: result.data };
}
