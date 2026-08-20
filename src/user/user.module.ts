import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';
import { UserV1Controller } from 'src/user/controllers/v1/user-v1.controller';
import { UserV2Controller } from 'src/user/controllers/v2/user-v2.controller';
import { UserV1Service } from 'src/user/services/v1/user-v1.service';
import { UserV2Service } from 'src/user/services/v2/user-v2.service';
import { UserV2Mapper } from 'src/user/mappers/user-v2.mapper';

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [UserV1Controller, UserV2Controller],
  providers: [UserV1Service, UserV2Service, UserV2Mapper],
})
export class UserModule {}
