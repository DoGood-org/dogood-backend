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
import { AuthV1DataMapper } from '@/auth/data-mappers/v1/auth-v1.data-mapper';
import {
  LoginRequestDtoV1,
  loginSchemaV1,
  RegisterRequestDtoV1,
  registerSchemaV1,
  ResendVerificationRequestDtoV1,
  resendVerificationSchemaV1,
  ForgotPasswordRequestDtoV1,
  forgotPasswordSchemaV1,
  ResetPasswordRequestDtoV1,
  resetPasswordSchemaV1,
} from '@/auth/dtos/v1/requests';
import {
  CurrentUserResponseDtoV1,
  ForgotPasswordResponseDtoV1,
  LoginResponseDtoV1,
  RefreshTokenResponseDtoV1,
  RegisterResponseDtoV1,
  ResendVerificationResponseDtoV1,
  ResetPasswordResponseDtoV1,
  VerifyEmailResponseDtoV1,
} from '@/auth/dtos/v1/responses';

@Controller({ path: 'auth', version: '1' })
export class AuthV1Controller {
  constructor(
    private readonly authService: AuthV1Service,
    private readonly cookieService: CookieService,
    private readonly dataMapper: AuthV1DataMapper,
  ) { }

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchemaV1)) input: RegisterRequestDtoV1,
    @Query('lang') language?: string,
  ): Promise<RegisterResponseDtoV1> {
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
    @Body(new ZodValidationPipe(loginSchemaV1)) input: LoginRequestDtoV1,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDtoV1> {
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
      user: this.dataMapper.toLoginUserResponse(user),
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
  ): Promise<VerifyEmailResponseDtoV1> {
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
    @Body(new ZodValidationPipe(resendVerificationSchemaV1))
    input: ResendVerificationRequestDtoV1,
    @Query('lang') language?: string,
  ): Promise<ResendVerificationResponseDtoV1> {
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
  async getCurrentUser(@User('id') id: string): Promise<CurrentUserResponseDtoV1> {
    const user = await this.authService.getCurrentUser(id);
    return {
      status: 'success',
      message: 'User data retrieved',
      code: SuccessCode.USER_DATA_RETRIEVED,
      user: this.dataMapper.toCurrentUserResponse(user),
    };
  }

  @Post('refresh-token')
  @Public()
  async refreshTokens(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ): Promise<RefreshTokenResponseDtoV1> {
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
    @Body(new ZodValidationPipe(forgotPasswordSchemaV1)) input: ForgotPasswordRequestDtoV1,
    @Query('lang') language?: string,
  ): Promise<ForgotPasswordResponseDtoV1> {
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
    @Body(new ZodValidationPipe(resetPasswordSchemaV1)) input: ResetPasswordRequestDtoV1,
  ): Promise<ResetPasswordResponseDtoV1> {
    await this.authService.resetPassword(token, input.password);
    return {
      message: 'Password has been reset successfully',
      code: SuccessCode.PASSWORD_CHANGED,
    };
  }

  @Post('resend-reset-password')
  @Public()
  async resendResetPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchemaV1)) input: ForgotPasswordRequestDtoV1,
    @Query('lang') language?: string,
  ): Promise<ForgotPasswordResponseDtoV1> {
    await this.authService.forgotPassword(input.email, language);
    return {
      message: 'Reset password email sent, check your inbox',
      code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    };
  }
}
