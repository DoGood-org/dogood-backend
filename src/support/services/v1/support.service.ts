import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { SupportMapperV1 } from 'src/support/mappers/v1/support.mapper';
import {
  CreateSupportMessageDataV1,
  SupportMessageV1,
  SupportResponseV1,
} from 'src/support/interfaces/support';

@Injectable()
export class SupportServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportMapper: SupportMapperV1,
  ) {}

  async createSupportMessage(
    data: CreateSupportMessageDataV1,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    const { email, subject, message } = data;
    const supportMessage = await this.prisma.supportMessage.create({
      data: { email, subject, message },
      select: {
        id: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    // NOTE: unreachable (create returns a row or throws) — kept verbatim from legacy.
    if (!supportMessage) {
      throw new V1ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create support message',
        ErrorCode.SUPPORT_MESSAGE_CREATION_FAILED,
      );
    }

    return this.supportMapper.toSupportResponse(
      supportMessage,
      SuccessCode.SUPPORT_MESSAGE_CREATED,
    );
  }

  async getSupportMessages(): Promise<SupportResponseV1<SupportMessageV1[]>> {
    const supportMessages = await this.prisma.supportMessage.findMany({
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

    return this.supportMapper.toSupportResponse(
      supportMessages,
      SuccessCode.SUPPORT_MESSAGES_FETCHED,
    );
  }

  async getSupportMessageById(
    id: string,
  ): Promise<SupportResponseV1<SupportMessageV1>> {
    const supportMessage = await this.prisma.supportMessage.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    if (!supportMessage) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Support message not found',
        ErrorCode.SUPPORT_MESSAGE_NOT_FOUND,
      );
    }

    return this.supportMapper.toSupportResponse(
      supportMessage,
      SuccessCode.SUPPORT_MESSAGE_FETCHED,
    );
  }
}
