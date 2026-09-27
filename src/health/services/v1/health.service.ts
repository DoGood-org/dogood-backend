import {
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HealthReadinessResultV1 } from 'src/health/interfaces/health';

@Injectable()
export class HealthServiceV1 {
  private readonly logger = new Logger(HealthServiceV1.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealthReadiness(): Promise<HealthReadinessResultV1> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error('Readiness database check failed', error);

      // NOTE: legacy answered 500 with the raw Prisma message; 503 and a fixed message are the human's decision.
      throw new ServiceUnavailableException({
        status: 'error',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: null,
        message: 'Database unavailable',
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: { database: 'up' },
    };
  }
}
