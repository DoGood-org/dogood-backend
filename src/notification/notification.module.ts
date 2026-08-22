import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { NotificationV1Controller } from 'src/notification/controllers/v1/notification-v1.controller';
import { NotificationV2Controller } from 'src/notification/controllers/v2/notification-v2.controller';
import { NotificationService } from 'src/notification/services/notification.service';
import { NotificationV1Service } from 'src/notification/services/v1/notification-v1.service';
import { NotificationV2Service } from 'src/notification/services/v2/notification-v2.service';
import { NotificationV1Mapper } from 'src/notification/mappers/notification-v1.mapper';

/** Експортуємо лише NotificationService — доменні модулі не мають знати про версії API. */
@Module({
  imports: [DatabaseModule],
  controllers: [NotificationV1Controller, NotificationV2Controller],
  providers: [
    NotificationService,
    NotificationV1Service,
    NotificationV2Service,
    NotificationV1Mapper,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
