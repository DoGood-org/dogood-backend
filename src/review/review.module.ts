import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { NotificationModule } from 'src/notification/notification.module';
import { ReviewControllerV1 } from 'src/review/controllers/v1/review.controller';
import { ReviewAdminV1Guard } from 'src/review/guards/review-admin-v1.guard';
import { ReviewMapperV1 } from 'src/review/mappers/v1/review.mapper';
import { ReviewServiceV1 } from 'src/review/services/v1/review.service';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [ReviewControllerV1],
  providers: [ReviewServiceV1, ReviewMapperV1, ReviewAdminV1Guard],
})
export class ReviewModule {}
