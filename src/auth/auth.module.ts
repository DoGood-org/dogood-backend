import { Module } from '@nestjs/common';
import { AuthV1Controller } from '@/auth/controllers/v1/auth-v1.controller';
import { AuthV2Controller } from '@/auth/controllers/v2/auth-v2.controller';

import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';
import { I18nModule } from 'src/i18n/i18n.module';
import { AuthV1Service } from './services/v1/auth-v1.service';
import { AuthV2Service } from './services/v2/auth-v2.service';
import { TokenCleanupCronService } from './services/token-cleanup.cron';

@Module({
  imports: [DatabaseModule, SharedModule, I18nModule],
  controllers: [AuthV1Controller, AuthV2Controller],
  providers: [AuthV1Service, AuthV2Service, TokenCleanupCronService],
})
export class AuthModule {}
