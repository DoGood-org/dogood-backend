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
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@shared/decorators/public.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { CookieService } from '@shared/services/cookie.service';
import {
  AuthV2Service,
  PublicUser,
} from 'src/auth/services/v2/auth-v2.service';
import { LoginDto } from './requests/login.dto';
import { RegisterDto } from './requests/register.dto';
import { ResendVerificationDto } from './requests/resend-verification.dto';
import { ForgotPasswordDto } from './requests/forgot-password.dto';
import { ResetPasswordDto } from './requests/reset-password.dto';

@Controller({ path: 'auth', version: '2' })
@Public()
export class AuthV2Controller {
  constructor(
    private readonly authService: AuthV2Service,
    private readonly cookieService: CookieService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() input: RegisterDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const user = await this.authService.register(input, acceptLanguage);
    return new ResponseWrapper(user);
  }

  @Post('login')
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const { user, tokens } = await this.authService.login(
      input,
      ip,
      request.headers['user-agent'],
    );
    this.cookieService.setAuthTokens(
      response,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return new ResponseWrapper(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');
    if (refreshToken) await this.authService.logout(refreshToken);
    this.cookieService.clearAllCookies(response, [
      'accessToken',
      'refreshToken',
    ]);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not found');
    const { tokens } = await this.authService.refreshTokens(
      refreshToken,
      ip,
      request.headers['user-agent'],
    );
    this.cookieService.setAuthTokens(
      response,
      tokens.accessToken,
      tokens.refreshToken,
    );
  }

  @Get('verify-email/:code')
  async verifyEmail(
    @Param('code') code: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const user = await this.authService.verifyEmail(code);
    return new ResponseWrapper(user);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() input: ResendVerificationDto,
  ): Promise<void> {
    await this.authService.resendVerificationEmail(input.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() input: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(input.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() input: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(input.token, input.password);
  }
}
