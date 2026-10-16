import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LocationModule } from 'src/location/location.module';
import { UserControllerV1 } from 'src/user/controllers/v1/user.controller';
import { UserMapperV1 } from 'src/user/mappers/v1/user.mapper';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

@Module({
  imports: [DatabaseModule, LocationModule],
  controllers: [UserControllerV1],
  providers: [UserServiceV1, UserMapperV1],
  exports: [UserServiceV1],
})
export class UserModule {}
