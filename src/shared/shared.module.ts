import { Module } from '@nestjs/common';
import { TokensService } from './services/tokens.service';
import { CookieService } from './services/cookie.service';
import { EmailService } from './services/email.service';
import { HashService } from './services/hash.service';

@Module({
  providers: [TokensService, CookieService, EmailService, HashService],
  exports: [TokensService, CookieService, EmailService, HashService],
})
export class SharedModule {}
