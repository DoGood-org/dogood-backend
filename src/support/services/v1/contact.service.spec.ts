import { HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';
import { ContactServiceV1 } from 'src/support/services/v1/contact.service';

describe('ContactServiceV1', () => {
  const prisma = { contact: { create: jest.fn() } };
  const service = new ContactServiceV1(
    prisma as unknown as PrismaService,
    new SupportMapperV1(),
  );
  const data = {
    name: 'Ann',
    phone: '+380 (67) 123',
    email: 'ann@b.co',
    message: 'Hi',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should create an anonymous contact and return the envelope with a top-level message', async () => {
    const row = {
      id: 'c-1',
      ...data,
      createdAt: new Date('2026-09-24T00:00:00Z'),
    };
    prisma.contact.create.mockResolvedValue(row);

    const result = await service.createContact(data);

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        message: true,
        createdAt: true,
      },
    });
    expect(result).toEqual({
      status: 'success',
      code: SuccessCode.CONTACT_CREATED,
      message: 'Your message was sent successfully!',
      data: row,
    });
  });

  it('should turn any create failure into 500 CONTACT_CREATION_FAILED', async () => {
    prisma.contact.create.mockRejectedValue(new Error('db down'));

    const error: unknown = await service
      .createContact(data)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(V1ApiException);
    expect((error as V1ApiException).getStatus()).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect((error as V1ApiException).getResponse()).toEqual({
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.CONTACT_CREATION_FAILED,
      message: 'Failed to submit contact form',
    });
  });
});
