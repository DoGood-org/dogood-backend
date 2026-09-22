import { Injectable, NotFoundException } from '@nestjs/common';
import { HostType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { HostResult } from 'src/host/interfaces/host';

@Injectable()
export class HostService {
  constructor(private readonly prisma: PrismaService) {}

  async createHostByUser(userId: string): Promise<HostResult> {
    try {
      return await this.prisma.host.upsert({
        where: { userId, deletedAt: null },
        update: { type: HostType.USER, organizationId: null },
        create: { type: HostType.USER, userId },
        select: { id: true, type: true, userId: true, organizationId: true },
      });
    } catch (error) {
      return this.rethrowHostUpsertError(error, 'User not found');
    }
  }

  async createHostByOrganization(organizationId: string): Promise<HostResult> {
    try {
      return await this.prisma.host.upsert({
        where: { organizationId, deletedAt: null },
        update: { type: HostType.ORGANIZATION, userId: null },
        create: { type: HostType.ORGANIZATION, organizationId },
        select: { id: true, type: true, userId: true, organizationId: true },
      });
    } catch (error) {
      return this.rethrowHostUpsertError(error, 'Organization not found');
    }
  }

  // NOTE: P2002 means a soft-deleted host holds the unique owner id (the `deletedAt: null` where missed,
  // create hit the unique index); P2003 means the owner row does not exist.
  private rethrowHostUpsertError(
    error: unknown,
    missingOwnerMessage: string,
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new NotFoundException('Host not found');
      }

      if (error.code === 'P2003') {
        throw new NotFoundException(missingOwnerMessage);
      }
    }

    throw error;
  }
}
