import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '@shared/decorators/public.decorator';
import { HealthReadinessResultV1 } from 'src/health/interfaces/health';
import { HealthServiceV1 } from 'src/health/services/v1/health.service';

// NOTE: served at the legacy /health/* path — excluded from the `api` prefix in main.ts.
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthControllerV1 {
  constructor(private readonly healthService: HealthServiceV1) {}

  @Get('liveness')
  getHealthLiveness(): string {
    return 'OK';
  }

  @Get('readiness')
  async getHealthReadiness(): Promise<HealthReadinessResultV1> {
    return await this.healthService.getHealthReadiness();
  }
}
