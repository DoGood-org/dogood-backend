import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
