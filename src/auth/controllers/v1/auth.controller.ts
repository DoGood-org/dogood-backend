import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { CookieService } from '@shared/services/cookie.service';
import { AuthEmailRequestDtoV1 } from 'src/auth/dtos/requests/v1/auth-email-request.dto';
import { LoginRequestDtoV1 } from 'src/auth/dtos/requests/v1/login-request.dto';
import { ResetPasswordRequestDtoV1 } from 'src/auth/dtos/requests/v1/reset-password-request.dto';
import { SignupRequestDtoV1 } from 'src/auth/dtos/requests/v1/signup-request.dto';
import {
  AuthMessageResponseV1,
  AuthSessionV1,
  AuthStatusResponseV1,
  CurrentUserResponseV1,
  LoginResponseV1,
} from 'src/auth/interfaces/auth';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';

const AUTH_COOKIE_NAMES = ['accessToken', 'refreshToken'];

// NOTE: legacy `authRoute` (`develop:src/routes/api/auth.route.ts`); only current-user had authenticateUser.
@Controller({ path: 'auth', version: '1' })
export class AuthControllerV1 {
  constructor(
    private readonly authService: AuthServiceV1,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupRequestDtoV1,
    @Query('lang') lang?: string,
  ): Promise<AuthStatusResponseV1> {
    return await this.authService.signup(dto, lang);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDtoV1,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseV1> {
    try {
      const result = await this.authService.login(dto, { ip, userAgent });

      this.setAuthCookies(response, result.session);

      return result.response;
    } catch (error) {
      this.clearAuthCookiesOnBan(response, error);

      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');

    await this.authService.logout(refreshToken);
    this.cookieService.clearAllCookies(response, AUTH_COOKIE_NAMES);
  }

  @Public()
  @Get('verify-email/:verificationCode')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Param('verificationCode') verificationCode: string,
  ): Promise<AuthStatusResponseV1> {
    return await this.authService.verifyEmail(verificationCode);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(
    @Body() dto: AuthEmailRequestDtoV1,
    @Query('lang') lang?: string,
  ): Promise<AuthMessageResponseV1> {
    return await this.authService.resendVerificationEmail(dto, lang);
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(
    @User('id') userId: string,
  ): Promise<CurrentUserResponseV1> {
    return await this.authService.getCurrentUser(userId);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Req() request: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthMessageResponseV1> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');

    try {
      const result = await this.authService.refreshTokens(refreshToken, {
        ip,
        userAgent,
      });

      if (result.session !== null) {
        this.setAuthCookies(response, result.session);
      }

      return result.response;
    } catch (error) {
      this.clearAuthCookiesOnBan(response, error);

      throw error;
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: AuthEmailRequestDtoV1,
    @Query('lang') lang?: string,
  ): Promise<AuthMessageResponseV1> {
    return await this.authService.forgotPassword(dto, lang);
  }

  @Public()
  @Post('reset-password/:resetPasswordToken')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('resetPasswordToken') resetPasswordToken: string,
    @Body() dto: ResetPasswordRequestDtoV1,
  ): Promise<AuthMessageResponseV1> {
    return await this.authService.resetPassword(resetPasswordToken, dto);
  }

  // NOTE: the legacy path is misspelled ("resent") — the frontend calls it verbatim.
  @Public()
  @Post('resent-forgot-password')
  @HttpCode(HttpStatus.OK)
  async resendResetPassword(
    @Body() dto: AuthEmailRequestDtoV1,
    @Query('lang') lang?: string,
  ): Promise<AuthMessageResponseV1> {
    return await this.authService.resendResetPassword(dto, lang);
  }

  private setAuthCookies(response: Response, session: AuthSessionV1): void {
    const { accessToken, refreshToken, refreshTokenMaxAgeMs } = session;

    this.cookieService.setAuthTokens(
      response,
      accessToken,
      refreshToken,
      refreshTokenMaxAgeMs,
    );
  }

  // NOTE: legacy cleared both cookies before answering 403 to a banned user.
  private clearAuthCookiesOnBan(response: Response, error: unknown): void {
    if (!(error instanceof V1ApiException)) {
      return;
    }

    const body = error.getResponse();

    if (typeof body === 'object' && 'bannedUser' in body) {
      this.cookieService.clearAllCookies(response, AUTH_COOKIE_NAMES);
    }
  }
}
