import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';
import { UserControllerV1 } from 'src/user/controllers/v1/user.controller';
import { UserControllerV2 } from 'src/user/controllers/v2/user.controller';
import { UserDataMapperV1 } from 'src/user/data-mappers/v1/user.data-mapper';
import { UserDataMapperV2 } from 'src/user/data-mappers/v2/user.data-mapper';
import { UserServiceV1 } from 'src/user/services/v1/user.service';
import { UserServiceV2 } from 'src/user/services/v2/user.service';

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [UserControllerV1, UserControllerV2],
  providers: [UserServiceV1, UserServiceV2, UserDataMapperV1, UserDataMapperV2],
})
export class UserModule {}
