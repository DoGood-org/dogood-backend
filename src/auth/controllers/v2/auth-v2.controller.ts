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
import { ZodValidationPipe } from 'nestjs-zod';
import { Public } from '@shared/decorators/public.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { CookieService } from '@shared/services/cookie.service';
import {
  AuthV2Service,
  PublicUser,
} from 'src/auth/services/v2/auth-v2.service';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RegisterDto, registerSchema } from './dto/register.dto';
import {
  ResendVerificationDto,
  resendVerificationSchema,
} from './dto/resend-verification.dto';
import {
  ForgotPasswordDto,
  forgotPasswordSchema,
} from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  resetPasswordSchema,
} from './dto/reset-password.dto';

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
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const user = await this.authService.register(input, acceptLanguage);
    return new ResponseWrapper(user);
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const result = await this.authService.login(
      input,
      ip,
      request.headers['user-agent'],
    );
    this.setTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    return new ResponseWrapper(result.user);
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
    const result = await this.authService.refreshTokens(
      refreshToken,
      ip,
      request.headers['user-agent'],
    );
    this.setTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
  }

  @Get('verify/:code')
  async verifyEmail(
    @Param('code') code: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const user = await this.authService.verifyEmail(code);
    return new ResponseWrapper(user);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema))
    input: ResendVerificationDto,
  ): Promise<void> {
    await this.authService.resendVerificationEmail(input.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) input: ForgotPasswordDto,
  ): Promise<void> {
    await this.authService.forgotPassword(input.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) input: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(input.token, input.password);
  }

  private setTokens(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    this.cookieService.setCookie(response, 'accessToken', accessToken, {
      maxAge: 15 * 60 * 1000,
    });
    this.cookieService.setCookie(response, 'refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
