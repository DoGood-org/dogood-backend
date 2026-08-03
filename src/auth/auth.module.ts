import { Module } from '@nestjs/common';
import { AuthService } from 'src/auth/services/auth.service';
import { AuthController } from 'src/auth/controllers/auth.controller';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';
import { I18nModule } from 'src/i18n/i18n.module';

@Module({
  imports: [DatabaseModule, SharedModule, I18nModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
