import { HttpStatus, Injectable } from '@nestjs/common';
import { BlockType, SiteRole, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { EmailService } from '@shared/services/email.service';
import { HashService } from '@shared/services/hash.service';
import { TokenPayload, TokensService } from '@shared/services/tokens.service';
import { getResetPasswordEmailHtml } from '@shared/templates/reset-password-email.template';
import { getVerificationEmailHtml } from '@shared/templates/verification-email.template';
import { AuthMapperV1 } from 'src/auth/mappers/v1/auth.mapper';
import {
  AuthClientDataV1,
  AuthEmailDataV1,
  AuthMessageResponseV1,
  AuthStatusResponseV1,
  BanCheckRowV1,
  CurrentUserResponseV1,
  LoginDataV1,
  LoginResultV1,
  RefreshTokensResultV1,
  ResetPasswordDataV1,
  SignupDataV1,
} from 'src/auth/interfaces/auth';
import {
  DEFAULT_LANGUAGE,
  Language,
  SUPPORTED_LANGUAGES,
} from 'src/i18n/i18n.constants';
import { I18nService } from 'src/i18n/services/i18n.service';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

const MINUTE_MS = 60 * 1000;
const SIGNUP_VERIFICATION_TTL_MS = 10 * MINUTE_MS;
const RESEND_VERIFICATION_TTL_MS = 15 * MINUTE_MS;
const RESET_PASSWORD_TTL_MS = 15 * MINUTE_MS;
const REFRESH_GRACE_PERIOD_MS = 15 * 1000;

// NOTE: legacy `isLang(query) ? query : 'en'` — an exact match only, no Accept-Language style parsing.
const isLanguage = (value: string | undefined): value is Language =>
  (SUPPORTED_LANGUAGES as readonly (string | undefined)[]).includes(value);

// NOTE: legacy `generateVerificationCode` — used for both the email code and the reset token.
const generateVerificationCode = (): string =>
  crypto.randomBytes(32).toString('hex');

// NOTE: legacy `verifyToken` throws `httpError(401, ...)` without a code, so the envelope carries `code: null`.
const invalidTokenV1Exception = (): V1ApiException =>
  new V1ApiException(
    HttpStatus.UNAUTHORIZED,
    'Invalid or expired token',
    ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
    {
      status: 'error',
      statusCode: HttpStatus.UNAUTHORIZED,
      code: null,
      message: 'Invalid or expired token',
    },
  );

@Injectable()
export class AuthServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly hashService: HashService,
    private readonly emailService: EmailService,
    private readonly i18nService: I18nService,
    private readonly userService: UserServiceV1,
    private readonly authMapper: AuthMapperV1,
  ) {}

  async signup(
    data: SignupDataV1,
    lang?: string,
  ): Promise<AuthStatusResponseV1> {
    const { name, email, password } = data;
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        'User already exists',
        ErrorCode.USER_ALREADY_EXISTS,
      );
    }

    const hashedPassword = await this.hashService.hashPassword(password);
    const emailVerificationCode = generateVerificationCode();

    await this.prisma.$transaction(async (tx) => {
      const { id } = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: SiteRole.USER,
          isEmailVerified: false,
          emailVerificationCode,
          emailVerificationExpiresAt: new Date(
            Date.now() + SIGNUP_VERIFICATION_TTL_MS,
          ),
        },
        select: { id: true },
      });

      // NOTE: legacy `createUser` was never passed `lang`, so the stored language is always 'en'.
      await tx.userSettings.create({
        data: { userId: id, language: DEFAULT_LANGUAGE },
        select: { id: true },
      });
    });

    await this.sendVerificationEmail(email, emailVerificationCode, lang);

    return this.authMapper.toAuthStatusResponse(
      'User created. Please check your email to verify.',
      SuccessCode.USER_REGISTERED,
    );
  }

  // NOTE: legacy check order is kept: ban and email verification are answered before the password is compared.
  async login(
    data: LoginDataV1,
    client: AuthClientDataV1,
  ): Promise<LoginResultV1> {
    const { email, password } = data;
    const { ip, userAgent } = client;
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        ban: {
          select: { banType: true, banReason: true, banExpiresAt: true },
        },
        userProfile: {
          select: {
            id: true,
            userId: true,
            bio: true,
            avatar: true,
            gender: true,
            birthDate: true,
            phoneNumber: true,
          },
        },
        userSettings: { select: { theme: true, language: true } },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    }

    await this.assertUserNotBanned(user);

    if (!user.isEmailVerified) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
      );
    }

    const isPasswordValid = await this.hashService.verifyPassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    }

    const tokens = await this.tokensService.createTokenPair({
      sub: user.id,
      role: user.role,
    });
    const refreshTokenMaxAgeMs =
      this.tokensService.getRefreshTokenExpiresInMs();

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
      },
      select: { id: true },
    });
    await this.cleanupExpiredRefreshTokens();

    return {
      response: this.authMapper.toLoginResponse(user),
      session: this.authMapper.toAuthSession(tokens, refreshTokenMaxAgeMs),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'No refresh token provided',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const { sub } = await this.verifyRefreshToken(refreshToken);

    // NOTE: legacy deleted every refresh token of the user; revoking them ends the same sessions
    // and is what the realtime socket auth checks.
    await this.prisma.refreshToken.updateMany({
      where: { userId: sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(code: string): Promise<AuthStatusResponseV1> {
    // NOTE: the expiry filter lives in the query (legacy), so an expired code is "invalid";
    // legacy's separate "expired" branch after it could never run and is not ported.
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: { gte: new Date() },
        deletedAt: null,
      },
      select: { id: true, isEmailVerified: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid verification code',
        ErrorCode.EMAIL_VERIFICATION_INVALID,
      );
    }

    if (user.isEmailVerified) {
      return this.authMapper.toAuthStatusResponse(
        'Email already verified',
        SuccessCode.EMAIL_ALREADY_VERIFIED,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
      select: { id: true },
    });

    return this.authMapper.toAuthStatusResponse(
      'Email successfully verified',
      SuccessCode.EMAIL_VERIFICATION_SUCCESS,
    );
  }

  async resendVerificationEmail(
    data: AuthEmailDataV1,
    lang?: string,
  ): Promise<AuthMessageResponseV1> {
    const { email } = data;
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    if (user.isEmailVerified) {
      return this.authMapper.toAuthMessageResponse(
        'Email already verified',
        SuccessCode.EMAIL_ALREADY_VERIFIED,
      );
    }

    const emailVerificationCode = generateVerificationCode();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode,
        emailVerificationExpiresAt: new Date(
          Date.now() + RESEND_VERIFICATION_TTL_MS,
        ),
      },
      select: { id: true },
    });
    await this.sendVerificationEmail(user.email, emailVerificationCode, lang);

    return this.authMapper.toAuthMessageResponse(
      'Verification email resent. Please check your inbox.',
      SuccessCode.EMAIL_RESEND_SUCCESS,
    );
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponseV1> {
    const user = await this.userService.getFullUser(userId);

    return this.authMapper.toCurrentUserResponse(user);
  }

  // NOTE: the row is rotated in place (not legacy revoke + create): its id is the login session a
  // realtime socket is bound to. A request that loses the race gets legacy's "already refreshed".
  async refreshTokens(
    refreshToken: string | undefined,
    client: AuthClientDataV1,
  ): Promise<RefreshTokensResultV1> {
    const { ip, userAgent } = client;

    if (!refreshToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const { sub } = await this.verifyRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { userId: sub, token: refreshToken },
      select: { id: true, expiresAt: true, revokedAt: true, updatedAt: true },
    });

    if (!storedToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Token not found',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Refresh token expired',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    if (storedToken.revokedAt !== null) {
      if (
        Date.now() - storedToken.updatedAt.getTime() <
        REFRESH_GRACE_PERIOD_MS
      ) {
        return this.toAlreadyRefreshedResult();
      }

      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: sub, deletedAt: null },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        ban: {
          select: { banType: true, banReason: true, banExpiresAt: true },
        },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    await this.assertUserNotBanned(user);

    const tokens = await this.tokensService.createTokenPair({
      sub: user.id,
      role: user.role,
    });
    const refreshTokenMaxAgeMs =
      this.tokensService.getRefreshTokenExpiresInMs();
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, token: refreshToken, revokedAt: null },
      data: {
        token: tokens.refreshToken,
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
      },
    });

    if (count === 0) {
      return this.toAlreadyRefreshedResult();
    }

    return {
      response: this.authMapper.toAuthMessageResponse(
        'Tokens refreshed successfully',
        SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
      ),
      session: this.authMapper.toAuthSession(tokens, refreshTokenMaxAgeMs),
    };
  }

  async forgotPassword(
    data: AuthEmailDataV1,
    lang?: string,
  ): Promise<AuthMessageResponseV1> {
    const { email } = data;

    await this.sendResetPasswordEmail(email, lang);

    return this.authMapper.toAuthMessageResponse(
      'Reset password email sent, check your inbox',
      SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    );
  }

  async resendResetPassword(
    data: AuthEmailDataV1,
    lang?: string,
  ): Promise<AuthMessageResponseV1> {
    const { email } = data;

    await this.sendResetPasswordEmail(email, lang);

    return this.authMapper.toAuthMessageResponse(
      'Reset password email resent, check your inbox',
      SuccessCode.PASSWORD_RESET_EMAIL_SENT,
    );
  }

  async resetPassword(
    resetPasswordToken: string,
    data: ResetPasswordDataV1,
  ): Promise<AuthMessageResponseV1> {
    const { password } = data;

    if (!resetPasswordToken || resetPasswordToken.trim() === '') {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Reset token is required',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpiresAt: { gte: new Date() },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid reset code',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    const hashedPassword = await this.hashService.hashPassword(password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
      select: { id: true },
    });

    return this.authMapper.toAuthMessageResponse(
      'Password has been reset successfully',
      SuccessCode.PASSWORD_CHANGED,
    );
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<TokenPayload> {
    try {
      return await this.tokensService.verifyRefreshToken(refreshToken);
    } catch {
      throw invalidTokenV1Exception();
    }
  }

  // NOTE: legacy `checkAndReleaseBan`: an expired temporary ban is lifted and the request goes on.
  private async assertUserNotBanned(user: BanCheckRowV1): Promise<void> {
    const { id, status, ban } = user;

    if (status !== UserStatus.BANNED) {
      return;
    }

    const banExpiresAt = ban?.banExpiresAt ?? null;

    if (
      ban === null ||
      ban.banType === BlockType.PERMANENT ||
      banExpiresAt === null ||
      new Date() <= banExpiresAt
    ) {
      throw V1ApiException.banned(user);
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE, ban: { delete: true } },
      select: { id: true },
    });
  }

  // NOTE: legacy ran this global cleanup on every login: expired and revoked rows only.
  private async cleanupExpiredRefreshTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() }, revokedAt: { not: null } },
    });
  }

  private async sendVerificationEmail(
    email: string,
    code: string,
    lang?: string,
  ): Promise<void> {
    const language = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
    const t = this.i18nService.getFixedT(language);

    await this.emailService.sendEmail({
      to: email,
      subject: t('email.verification.subject'),
      html: getVerificationEmailHtml(code, t, language),
    });
  }

  // NOTE: legacy `sendResetPasswordEmail`, shared by forgot-password and its resend.
  private async sendResetPasswordEmail(
    email: string,
    lang?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    const resetPasswordToken = generateVerificationCode();
    const language = isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
    const t = this.i18nService.getFixedT(language);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpiresAt: new Date(Date.now() + RESET_PASSWORD_TTL_MS),
      },
      select: { id: true },
    });
    await this.emailService.sendEmail({
      to: user.email,
      subject: t('email.resetPassword.subject'),
      html: getResetPasswordEmailHtml(resetPasswordToken, t, language),
    });
  }

  private toAlreadyRefreshedResult(): RefreshTokensResultV1 {
    return {
      response: this.authMapper.toAuthMessageResponse(
        'Tokens already refreshed',
        SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
      ),
      session: null,
    };
  }
}
