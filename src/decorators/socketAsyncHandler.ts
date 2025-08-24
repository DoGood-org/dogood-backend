import logger from '@/utils/logger';

export const socketAsyncHandler = (
  handler: Function,
  options?: { errorEvent?: string; errorMessage?: string }
) => {
  return async (socket: any, ...args: any[]) => {
    try {
      await handler(socket, ...args);
    } catch (error) {
      logger.error(`❌ [${socket.id}] Error in socket handler`, { error });

      const errorEvent = options?.errorEvent || 'error';
      const errorMessage =
        options?.errorMessage ||
        'An unexpected error occurred. Please try again later.';

      socket.emit(errorEvent, {
        errors: [errorMessage],
      });
    }
  };
};
