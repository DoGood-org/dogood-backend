import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { HostModule } from 'src/host/host.module';
import { LocationModule } from 'src/location/location.module';
import { NotificationModule } from 'src/notification/notification.module';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';

@Module({
  imports: [DatabaseModule, HostModule, LocationModule, NotificationModule],
  controllers: [],
  providers: [TaskAccessService, TaskGeoSearchService],
})
export class TaskModule {}
