import { HttpStatus } from '@nestjs/common';
import { Prisma, SupportMessageStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';
import { SupportServiceV1 } from 'src/support/services/v1/support.service';

describe('SupportServiceV1', () => {
  const prisma = {
    supportMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const service = new SupportServiceV1(
    prisma as unknown as PrismaService,
    new SupportMapperV1(),
  );
  const row = {
    id: 'sm-1',
    email: 'a@b.co',
    subject: 'Help',
    message: 'Something broke here',
    status: SupportMessageStatus.NEW,
    createdAt: new Date('2026-09-24T00:00:00Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createSupportMessage', () => {
    it('should create without userId and return the legacy envelope', async () => {
      prisma.supportMessage.create.mockResolvedValue(row);

      const result = await service.createSupportMessage({
        email: 'a@b.co',
        subject: 'Help',
        message: 'Something broke here',
      });

      expect(prisma.supportMessage.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.co',
          subject: 'Help',
          message: 'Something broke here',
        },
        select: {
          id: true,
          email: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
        },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGE_CREATED,
        data: row,
      });
    });

    it('should throw 500 SUPPORT_MESSAGE_CREATION_FAILED when create returns nothing', async () => {
      prisma.supportMessage.create.mockResolvedValue(null);

      const error: unknown = await service
        .createSupportMessage({
          email: 'a@b.co',
          subject: 'Hel',
          message: '0123456789',
        })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(V1ApiException);
      expect((error as V1ApiException).getStatus()).toBe(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect((error as V1ApiException).getResponse()).toMatchObject({
        code: ErrorCode.SUPPORT_MESSAGE_CREATION_FAILED,
      });
    });
  });

  describe('getSupportMessages', () => {
    it('should list non-deleted messages newest first', async () => {
      prisma.supportMessage.findMany.mockResolvedValue([row]);

      const result = await service.getSupportMessages();

      expect(prisma.supportMessage.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        select: {
          id: true,
          email: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
        },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGES_FETCHED,
        data: [row],
      });
    });
  });

  describe('getSupportMessageById', () => {
    it('should return the message by string id, skipping deleted rows', async () => {
      prisma.supportMessage.findFirst.mockResolvedValue(row);

      const result = await service.getSupportMessageById('sm-1');

      expect(prisma.supportMessage.findFirst).toHaveBeenCalledWith({
        where: { id: 'sm-1', deletedAt: null },
        select: {
          id: true,
          email: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
        },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.SUPPORT_MESSAGE_FETCHED,
        data: row,
      });
    });

    it('should throw 404 SUPPORT_MESSAGE_NOT_FOUND when missing or deleted', async () => {
      prisma.supportMessage.findFirst.mockResolvedValue(null);

      const error: unknown = await service
        .getSupportMessageById('abc')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(V1ApiException);
      expect((error as V1ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as V1ApiException).getResponse()).toEqual({
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.SUPPORT_MESSAGE_NOT_FOUND,
        message: 'Support message not found',
      });
    });
  });
});
