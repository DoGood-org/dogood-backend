import { Injectable } from '@nestjs/common';
import { Prisma, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { RealtimeSocketSessionV1 } from 'src/realtime/interfaces/realtime';

@Injectable()
export class RealtimeServiceV1 {
  constructor(private readonly prisma: PrismaService) {}

  // NOTE: the socket is bound to the refresh-token row (the login session): a logged-out, expired, banned or
  // soft-deleted session leaves it a guest. `null` means guest.
  async findSocketSession(
    userId: string,
    refreshToken: string,
  ): Promise<RealtimeSocketSessionV1 | null> {
    const session = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId, ...this.getActiveSessionWhere() },
      select: { id: true, user: { select: { role: true } } },
    });

    if (session === null) {
      return null;
    }

    const { id, user } = session;

    return { sessionId: id, role: user.role };
  }

  // NOTE: `role` is part of the check, so a changed role fails it and the socket re-authenticates on reconnect.
  async isSocketSessionActive(
    sessionId: string,
    role: SiteRole,
  ): Promise<boolean> {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, ...this.getActiveSessionWhere(role) },
      select: { id: true },
    });

    return session !== null;
  }

  async getActiveSocketSessionRoles(
    sessionIds: string[],
  ): Promise<Map<string, SiteRole>> {
    const sessions = await this.prisma.refreshToken.findMany({
      where: { id: { in: sessionIds }, ...this.getActiveSessionWhere() },
      select: { id: true, user: { select: { role: true } } },
    });

    return new Map(sessions.map(({ id, user }) => [id, user.role]));
  }

  // NOTE: `role` undefined means any role (Prisma skips undefined filters).
  private getActiveSessionWhere(
    role?: SiteRole,
  ): Prisma.RefreshTokenWhereInput {
    return {
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { deletedAt: null, status: { not: UserStatus.BANNED }, role },
    };
  }
}
