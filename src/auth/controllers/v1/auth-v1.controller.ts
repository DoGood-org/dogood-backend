import {
  Body,
  Controller,
  Get,
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
import { ZodValidationPipe } from 'nestjs-zod';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '@shared/decorators/user.decorator';
import { CookieService } from '@shared/services/cookie.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { AuthV1Service } from 'src/auth/services/v1/auth-v1.service';
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
import {
  CurrentUserResponseDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto,
  RegisterResponseDto,
  ResendVerificationResponseDto,
  ResetPasswordResponseDto,
  VerifyEmailResponseDto,
} from './responses';

@Controller({ path: 'auth', version: '1' })
export class AuthV1Controller {
  constructor(
    private readonly authService: AuthV1Service,
    private readonly cookieService: CookieService,
  ) { }

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterDto,
    @Query('lang') language?: string,
  ): Promise<RegisterResponseDto> {
    await this.authService.register(input, language);
    return {
      status: 'success',
      code: SuccessCode.USER_REGISTERED,
      message: 'User created. Please check your email to verify.',
    };
  }

  @Post('login')
  @Public()
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
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
    return {
      message: 'User logged in successfully',
      code: SuccessCode.USER_LOGGED_IN,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.userProfile?.avatar ?? null,
        siteRole: user.role,
        settings: {
          theme: user.userSettings?.theme ?? 'light',
          language: user.userSettings?.language ?? 'en',
        },
        profile: user.userProfile,
      },
    };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');
    if (!refreshToken || !(await this.authService.logout(refreshToken))) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'No refresh token provided',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }
    this.cookieService.clearAllCookies(response, [
      'accessToken',
      'refreshToken',
    ]);
  }

  @Get('verify-email/:verificationCode')
  @Public()
  async verifyEmail(
    @Param('verificationCode') code: string,
  ): Promise<VerifyEmailResponseDto> {
    const { isAlreadyVerified } = await this.authService.verifyEmail(code);
    if (isAlreadyVerified) {
      return {
        status: 'success',
        code: SuccessCode.EMAIL_ALREADY_VERIFIED,
        message: 'Email already verified',
      };
    }
    return {
      status: 'success',
      code: SuccessCode.EMAIL_VERIFICATION_SUCCESS,
      message: 'Email successfully verified',
    };
  }

  @Post('resend-verification')
  @Public()
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema))
    input: ResendVerificationDto,
    @Query('lang') language?: string,
  ): Promise<ResendVerificationResponseDto> {
    const { isAlreadyVerified } =
      await this.authService.resendVerificationEmail(input.email, language);
    if (isAlreadyVerified) {
      return {
        message: 'Email already verified',
        code: SuccessCode.EMAIL_ALREADY_VERIFIED,
      };
    }
    return {
      message: 'Verification email resent. Please check your inbox.',
      code: SuccessCode.EMAIL_RESEND_SUCCESS,
    };
  }

  @Get('current-user')
  async getCurrentUser(@User('id') id: string): Promise<CurrentUserResponseDto> {
    const user = await this.authService.getCurrentUser(id);
    return {
      status: 'success',
      message: 'User data retrieved',
      code: SuccessCode.USER_DATA_RETRIEVED,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        userProfile: user.userProfile,
        userSettings: user.userSettings,
      },
    };
  }

  @Post('refresh-token')
  @Public()
  async refreshTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ): Promise<RefreshTokenResponseDto> {
    const refreshToken = this.cookieService.getCookie(request, 'refreshToken');
    if (!refreshToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const result = await this.authService.refreshTokens(
      refreshToken,
      ip,
      request.headers['user-agent'],
    );

    if ('alreadyRefreshed' in result) {
      return {
        message: 'Tokens already refreshed',
        code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
      };
    }

    this.cookieService.setAuthTokens(
      response,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    return {
      message: 'Tokens refreshed successfully',
      code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
    };
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) input: ForgotPasswordDto,
    @Query('lang') language?: string,
  ): Promise<ForgotPasswordResponseDto> {
    await this.authService.forgotPassword(input.email, language);
    return {
      message: 'Reset password email sent, check your inbox',
      code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    };
  }

  @Post('reset-password/:resetPasswordToken')
  @Public()
  async resetPassword(
    @Param('resetPasswordToken') token: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) input: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    await this.authService.resetPassword(token, input.password);
    return {
      message: 'Password has been reset successfully',
      code: SuccessCode.PASSWORD_CHANGED,
    };
  }

  @Post('resend-reset-password')
  @Public()
  async resendResetPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) input: ForgotPasswordDto,
    @Query('lang') language?: string,
  ): Promise<ForgotPasswordResponseDto> {
    await this.authService.forgotPassword(input.email, language);
    return {
      message: 'Reset password email sent, check your inbox',
      code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    };
  }
}
