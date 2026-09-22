import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { HostModule } from 'src/host/host.module';
import { LocationModule } from 'src/location/location.module';
import { NotificationModule } from 'src/notification/notification.module';
import { TaskModifyV1Guard } from 'src/task/guards/task-modify-v1.guard';
import { TaskModifyV2Guard } from 'src/task/guards/task-modify-v2.guard';
import { TaskStatusV1Guard } from 'src/task/guards/task-status-v1.guard';
import { TaskStatusV2Guard } from 'src/task/guards/task-status-v2.guard';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';

@Module({
  imports: [DatabaseModule, HostModule, LocationModule, NotificationModule],
  controllers: [],
  providers: [
    TaskAccessService,
    TaskGeoSearchService,
    TaskModifyV1Guard,
    TaskModifyV2Guard,
    TaskStatusV1Guard,
    TaskStatusV2Guard,
  ],
})
export class TaskModule {}
