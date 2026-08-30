import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class TokenCleanupCronService {
  private readonly logger = new Logger(TokenCleanupCronService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCleanupExpiredRefreshTokens(): Promise<number> {
    try {
      const deleted = await this.prismaService.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } },
          ],
        },
      });

      if (deleted.count > 0) {
        this.logger.log(`Cleaned up ${deleted.count} expired or revoked refresh tokens.`);
      }

      return deleted.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired refresh tokens', error);
      return 0;
    }
  }
}
