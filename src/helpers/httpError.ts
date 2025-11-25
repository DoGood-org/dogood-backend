import { ErrorCode } from '@/constants/apiCodes';
import logger from '../utils/logger';

const errorMessages: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
};


class HttpError extends Error {
  status: number;
  code?: ErrorCode; // machine-readable код

  constructor(status: number, message?: string, code?: ErrorCode) {
    const finalMessage = message || errorMessages[status] || 'Unknown error';
    super(finalMessage);

    this.name = 'HttpError';
    this.status = status;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }

    logger.error(`HttpError ${status}: ${finalMessage}`, { code });
  }
}

export const httpError = (
  status: number,
  message?: string,
  code?: ErrorCode
): HttpError => {
  return new HttpError(status, message, code);
};
