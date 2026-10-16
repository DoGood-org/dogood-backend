import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SharedModule } from '@shared/shared.module';
import { AuthControllerV1 } from 'src/auth/controllers/v1/auth.controller';
import { AuthMapperV1 } from 'src/auth/mappers/v1/auth.mapper';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';
import { I18nModule } from 'src/i18n/i18n.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [DatabaseModule, SharedModule, I18nModule, UserModule],
  controllers: [AuthControllerV1],
  providers: [AuthServiceV1, AuthMapperV1],
})
export class AuthModule {}
