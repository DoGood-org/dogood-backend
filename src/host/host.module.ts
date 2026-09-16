import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { HostService } from 'src/host/services/host.service';

@Module({
  imports: [DatabaseModule],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
