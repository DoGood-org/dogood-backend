import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';
import { I18nModule } from '../i18n/i18n.module';

@Module({
  imports: [DatabaseModule, SharedModule, I18nModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
