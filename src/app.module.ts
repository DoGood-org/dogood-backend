import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@database/database.module';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { I18nModule } from 'src/i18n/i18n.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AuthGuard } from '@shared/guards/auth.guard';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    SharedModule,
    I18nModule,
    AuthModule,
    UserModule,
    NotificationModule,
    ThrottlerModule.forRoot([
      // ThrottlerModule configuration(ask for more details)
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development', '.env.test'],
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
