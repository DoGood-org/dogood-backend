import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { NotificationControllerV1 } from 'src/notification/controllers/v1/notification.controller';
import { NotificationControllerV2 } from 'src/notification/controllers/v2/notification.controller';
import { NotificationMapperV1 } from 'src/notification/mappers/v1/notification.mapper';
import { NotificationServiceV1 } from 'src/notification/services/v1/notification.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationControllerV1, NotificationControllerV2],
  providers: [
    NotificationServiceV1,
    NotificationServiceV2,
    NotificationMapperV1,
  ],
})
export class NotificationModule {}
