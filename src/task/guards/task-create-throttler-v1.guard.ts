import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { isEnvFlagEnabled } from '@shared/utils/env-flag';

// NOTE: limits are `TASK_CREATE_THROTTLER_V1`, registered in `AppModule` (`ThrottlerModule.forRoot`).
// The 429 body is the one legacy `rateLimitMiddleware` answered with, not the v1 envelope.
@Injectable()
export class TaskCreateThrottlerV1Guard extends ThrottlerGuard {
  private readonly isTaskRateLimitEnabled: boolean;

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    configService: ConfigService,
  ) {
    super(options, storageService, reflector);
    this.isTaskRateLimitEnabled = isEnvFlagEnabled(
      configService.get<string>('IS_TASK_RATE_LIMIT_ENABLED', 'true'),
    );
  }

  protected override shouldSkip(): Promise<boolean> {
    return Promise.resolve(!this.isTaskRateLimitEnabled);
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { message: 'Too many requests. Please try again later.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
