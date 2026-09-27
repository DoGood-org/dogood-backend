import { Injectable } from '@nestjs/common';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class RealtimeServiceV1 {
  constructor(private readonly prisma: PrismaService) {}

  // NOTE: mirrors AuthGuard: the user must exist, not be soft-deleted and not be banned; `null` leaves the socket a guest.
  async getSocketUserRole(userId: string): Promise<SiteRole | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { status: true, role: true },
    });

    if (user === null || user.status === UserStatus.BANNED) {
      return null;
    }

    return user.role;
  }
}
