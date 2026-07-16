import { Module } from '@nestjs/common';
import { TokensService } from 'src/shared/services/tokens.service';
import { CookieService } from 'src/shared/services/cookie.service';
import { EmailService } from 'src/shared/services/email.service';
import { HashService } from 'src/shared/services/hash.service';

@Module({
  providers: [TokensService, CookieService, EmailService, HashService],
  exports: [TokensService, CookieService, EmailService, HashService],
})
export class SharedModule {}
