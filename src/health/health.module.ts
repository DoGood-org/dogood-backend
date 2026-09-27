import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { HealthControllerV1 } from 'src/health/controllers/v1/health.controller';
import { HealthServiceV1 } from 'src/health/services/v1/health.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthControllerV1],
  providers: [HealthServiceV1],
})
export class HealthModule {}
