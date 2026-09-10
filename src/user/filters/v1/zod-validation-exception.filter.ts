import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Renders a failed body validation in the legacy v1 error shape.
 * NOTE: `code` is `null` on purpose. develop:src/middlewares/validateBody.middleware.ts:20
 * called `httpError(400, message)` without a code, so develop:src/app.ts:86 sent
 * `code: err.code || null`. The message is the joined issue list, as the same middleware
 * built it on line 11.
 */
@Catch(ZodValidationException)
export class ZodValidationExceptionFilterV1 implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const zodError = exception.getZodError();
    const message =
      zodError instanceof ZodError
        ? zodError.issues.map((issue) => issue.message).join(', ')
        : exception.message;

    response.status(HttpStatus.BAD_REQUEST).json({
      status: 'error',
      statusCode: HttpStatus.BAD_REQUEST,
      code: null,
      message,
    });
  }
}
