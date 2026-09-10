import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { updateUserProfileRequestSchemaV1 } from 'src/user/dtos/v1/requests';
import { ZodValidationExceptionFilterV1 } from 'src/user/filters/v1/zod-validation-exception.filter';

describe('ZodValidationExceptionFilterV1', () => {
  const filter = new ZodValidationExceptionFilterV1();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    json.mockClear();
    status.mockClear();
  });

  it('should render a failed validation in the legacy error shape with a null code', () => {
    const parsed = updateUserProfileRequestSchemaV1.safeParse({
      phoneNumber: 'abc',
    });

    filter.catch(new ZodValidationException(parsed.error), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      statusCode: HttpStatus.BAD_REQUEST,
      code: null,
      message: 'Invalid phone number format',
    });
  });

  it('should join every issue message, as the legacy middleware did', () => {
    const parsed = updateUserProfileRequestSchemaV1.safeParse({
      phoneNumber: 'abc',
      bio: 'x'.repeat(501),
    });

    filter.catch(new ZodValidationException(parsed.error), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(', ') as string,
      }),
    );
  });
});
