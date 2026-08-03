import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthService, PublicUser } from 'src/auth/services/auth.service';
import { RegisterDto, registerSchema } from 'src/auth/dto/register.dto';
import { LoginDto, loginSchema } from 'src/auth/dto/login.dto';
import {
  ResendVerificationDto,
  resendVerificationSchema,
} from 'src/auth/dto/resend-verification.dto';
import {
  ForgotPasswordDto,
  forgotPasswordSchema,
} from 'src/auth/dto/forgot-password.dto';
import {
  ResetPasswordDto,
  resetPasswordSchema,
} from 'src/auth/dto/reset-password.dto';
import { CookieService } from '@shared/services/cookie.service';
import { Request, Response } from 'express';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { ZodValidationPipe } from 'nestjs-zod';
import { Public } from '@shared/decorators/public.decorator';

@Controller('auth')
@Public()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) registerDto: RegisterDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const result = await this.authService.register(registerDto, acceptLanguage);

    return new ResponseWrapper(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(loginDto, ip, userAgent);

    this.cookieService.setCookie(
      res,
      'accessToken',
      result.tokens.accessToken,
      {
        maxAge: 15 * 60 * 1000,
      },
    );

    this.cookieService.setCookie(
      res,
      'refreshToken',
      result.tokens.refreshToken,
      {
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return new ResponseWrapper(result.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(req, 'refreshToken');

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.cookieService.clearAllCookies(res, ['accessToken', 'refreshToken']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(req, 'refreshToken');

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const userAgent = req.headers['user-agent'];
    const result = await this.authService.refreshTokens(
      refreshToken,
      ip,
      userAgent,
    );

    this.cookieService.setCookie(
      res,
      'accessToken',
      result.tokens.accessToken,
      {
        maxAge: 15 * 60 * 1000,
      },
    );

    this.cookieService.setCookie(
      res,
      'refreshToken',
      result.tokens.refreshToken,
      {
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );
  }

  @Get('verify/:code')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Param('code') code: string,
  ): Promise<ResponseWrapper<PublicUser>> {
    const result = await this.authService.verifyEmail(code);
    return new ResponseWrapper(result);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema))
    resendDto: ResendVerificationDto,
  ): Promise<void> {
    await this.authService.resendVerificationEmail(resendDto.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    forgotDto: ForgotPasswordDto,
  ): Promise<void> {
    await this.authService.forgotPassword(forgotDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    resetDto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(resetDto.token, resetDto.password);
  }
}
