import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { HostModule } from 'src/host/host.module';
import { LocationModule } from 'src/location/location.module';
import { NotificationModule } from 'src/notification/notification.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { TaskControllerV1 } from 'src/task/controllers/v1/task.controller';
import { TaskControllerV2 } from 'src/task/controllers/v2/task.controller';
import { TaskModifyV1Guard } from 'src/task/guards/task-modify-v1.guard';
import { TaskModifyV2Guard } from 'src/task/guards/task-modify-v2.guard';
import { TaskStatusV1Guard } from 'src/task/guards/task-status-v1.guard';
import { TaskStatusV2Guard } from 'src/task/guards/task-status-v2.guard';
import { TaskMapperV1 } from 'src/task/mappers/v1/task.mapper';
import { TaskMapperV2 } from 'src/task/mappers/v2/task.mapper';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';
import { TaskServiceV2 } from 'src/task/services/v2/task.service';

@Module({
  imports: [
    DatabaseModule,
    HostModule,
    LocationModule,
    NotificationModule,
    OrganizationModule,
  ],
  controllers: [TaskControllerV1, TaskControllerV2],
  providers: [
    TaskServiceV1,
    TaskServiceV2,
    TaskMapperV1,
    TaskMapperV2,
    TaskAccessService,
    TaskGeoSearchService,
    TaskModifyV1Guard,
    TaskModifyV2Guard,
    TaskStatusV1Guard,
    TaskStatusV2Guard,
  ],
})
export class TaskModule {}
