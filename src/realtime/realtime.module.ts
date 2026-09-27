import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SharedModule } from '@shared/shared.module';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

@Module({
  imports: [DatabaseModule, SharedModule],
  providers: [RealtimeGatewayV1, RealtimeServiceV1],
  exports: [RealtimeGatewayV1],
})
export class RealtimeModule {}
