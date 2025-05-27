const errorMessages: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message || errorMessages[status] || 'Unknown error');
    this.name = 'HttpError';
    this.status = status;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export const httpError = (status: number, message?: string): HttpError => {
  return new HttpError(status, message);
};
