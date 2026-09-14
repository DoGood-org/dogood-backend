import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { NotificationControllerV1 } from 'src/notification/controllers/v1/notification.controller';
import { NotificationMapperV1 } from 'src/notification/mappers/v1/notification.mapper';
import { NotificationServiceV1 } from 'src/notification/services/v1/notification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationControllerV1],
  providers: [NotificationServiceV1, NotificationMapperV1],
})
export class NotificationModule {}
