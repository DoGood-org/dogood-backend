import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { SharedModule } from '@shared/shared.module';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
