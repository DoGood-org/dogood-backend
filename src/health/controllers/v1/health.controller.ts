import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { Public } from '@shared/decorators/public.decorator';
import { HealthReadinessResultV1 } from 'src/health/interfaces/health';
import { HealthServiceV1 } from 'src/health/services/v1/health.service';
import { HealthReadinessResponseDtoV1 } from 'src/health/dtos/responses/v1/health-readiness-response.dto';

// NOTE: served at the legacy /health/* path — excluded from the `api` prefix in main.ts.
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthControllerV1 {
  constructor(private readonly healthService: HealthServiceV1) {}

  @Get('liveness')
  @ApiOkResponse({ schema: { type: 'string', example: 'OK' } })
  getHealthLiveness(): string {
    return 'OK';
  }

  @Get('readiness')
  @ApiOkResponse({ type: HealthReadinessResponseDtoV1 })
  @ApiServiceUnavailableResponse({ description: 'Database is down' })
  async getHealthReadiness(): Promise<HealthReadinessResultV1> {
    return await this.healthService.getHealthReadiness();
  }
}
