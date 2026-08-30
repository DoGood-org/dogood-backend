import { Injectable, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TokenPair, TokensService } from '@shared/services/tokens.service';
import { HashService } from '@shared/services/hash.service';
import { EmailService } from '@shared/services/email.service';
import { SiteRole, UserStatus } from '@prisma/client';
import { getVerificationEmailHtml } from '@shared/templates/verification-email.template';
import { getResetPasswordEmailHtml } from '@shared/templates/reset-password-email.template';
import { I18nService } from 'src/i18n/services/i18n.service';
import * as crypto from 'crypto';
import { RegisterDto } from '@/auth/controllers/v1/dto/register.dto';
import { LoginDto } from '@/auth/controllers/v1/dto/login.dto';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { LegacyUser } from './types';

@Injectable()
export class AuthV1Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokensService: TokensService,
    private readonly hashService: HashService,
    private readonly emailService: EmailService,
    private readonly i18nService: I18nService,
  ) {}

  async register(
    input: RegisterDto,
    acceptLanguage?: string,
  ): Promise<LegacyUser> {
    const language = this.i18nService.resolveLanguage(acceptLanguage);
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        'User already exists',
        ErrorCode.USER_ALREADY_EXISTS,
      );
    }

    const hashedPassword = await this.hashService.hashPassword(input.password);
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await this.prismaService.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: SiteRole.USER,
          emailVerificationCode: verificationCode,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
        select: { id: true, email: true, name: true, role: true },
      });
      await tx.userSettings.create({
        data: { userId: createdUser.id, language },
      });
      return createdUser;
    });

    const t = this.i18nService.getFixedT(language);
    await this.emailService.sendEmail({
      to: user.email,
      subject: t('email.verification.subject'),
      html: getVerificationEmailHtml(verificationCode, t, language),
    });

    return user as LegacyUser;
  }

  async login(
    input: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ user: LegacyUser; tokens: TokenPair }> {
    const user = await this.findLegacyUserByEmail(input.email);
    if (
      !user ||
      !user.password ||
      !(await this.hashService.verifyPassword(input.password, user.password))
    ) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    }

    const isUnbanned = await this.checkAndReleaseBan(
      user.id,
      user.status,
      user.ban?.banType ?? null,
      user.ban?.banExpiresAt ?? null,
    );

    if (!isUnbanned || user.status === UserStatus.BANNED) {
      throw V1ApiException.banned(user);
    }

    if (!user.isEmailVerified) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
      );
    }

    const tokens = await this.createAndStoreTokenPair(
      user.id,
      user.role,
      ip,
      userAgent,
    );

    return { user, tokens };
  }

  async logout(refreshToken: string): Promise<boolean> {
    try {
      const payload = await this.tokensService.verifyRefreshToken(refreshToken);
      await this.prismaService.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async verifyEmail(code: string): Promise<{ isAlreadyVerified: boolean }> {
    const user = await this.prismaService.user.findFirst({
      where: { emailVerificationCode: code },
      select: {
        id: true,
        isEmailVerified: true,
        emailVerificationExpiresAt: true,
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid verification code',
        ErrorCode.EMAIL_VERIFICATION_INVALID,
      );
    }
    if (user.isEmailVerified) {
      return { isAlreadyVerified: true };
    }
    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Verification code expired',
        ErrorCode.EMAIL_VERIFICATION_EXPIRED,
      );
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { isAlreadyVerified: false };
  }

  async resendVerificationEmail(
    email: string,
    acceptLanguage?: string,
  ): Promise<{ isAlreadyVerified: boolean }> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        userSettings: { select: { language: true } },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }
    if (user.isEmailVerified) {
      return { isAlreadyVerified: true };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const language = this.i18nService.resolveLanguage(
      acceptLanguage ?? user.userSettings?.language,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const t = this.i18nService.getFixedT(language);
    await this.emailService.sendEmail({
      to: user.email,
      subject: t('email.verification.subject'),
      html: getVerificationEmailHtml(code, t, language),
    });

    return { isAlreadyVerified: false };
  }

  async getCurrentUser(id: string): Promise<LegacyUser> {
    const user = await this.findLegacyUserById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async refreshTokens(
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ tokens: TokenPair } | { alreadyRefreshed: true }> {
    try {
      await this.tokensService.verifyRefreshToken(refreshToken);
    } catch {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            ban: {
              select: { banType: true, banReason: true, banExpiresAt: true },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
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

    if (storedToken.revokedAt) {
      if (Date.now() - storedToken.updatedAt.getTime() < 15_000) {
        return { alreadyRefreshed: true };
      }
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    if (!storedToken.user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    const isUnbanned = await this.checkAndReleaseBan(
      storedToken.user.id,
      storedToken.user.status,
      storedToken.user.ban?.banType ?? null,
      storedToken.user.ban?.banExpiresAt ?? null,
    );

    if (!isUnbanned || storedToken.user.status === UserStatus.BANNED) {
      throw V1ApiException.banned(storedToken.user);
    }

    const revoked = await this.prismaService.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revoked.count === 0) return { alreadyRefreshed: true };

    const tokens = await this.createAndStoreTokenPair(
      storedToken.user.id,
      storedToken.user.role,
      ip,
      userAgent,
    );

    return { tokens };
  }

  async forgotPassword(
    email: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        userSettings: { select: { language: true } },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    const token = crypto.randomUUID();
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const language = this.i18nService.resolveLanguage(
      acceptLanguage ?? user.userSettings?.language,
    );
    const t = this.i18nService.getFixedT(language);
    await this.emailService.sendEmail({
      to: user.email,
      subject: t('email.resetPassword.subject'),
      html: getResetPasswordEmailHtml(token, t, language),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    if (!token || token.trim() === '') {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Reset token is required',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: { resetPasswordToken: token },
      select: { id: true, resetPasswordExpiresAt: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid reset code',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
    }
    if (
      user.resetPasswordExpiresAt &&
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Reset token has expired',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
    }

    const hashedPassword = await this.hashService.hashPassword(newPassword);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  }

  private async checkAndReleaseBan(
    userId: string,
    status: string | null,
    banType: string | null,
    banExpiresAt: Date | null,
  ): Promise<boolean> {
    if (status !== UserStatus.BANNED) return true;
    if (banType === 'PERMANENT' || !banExpiresAt) return false;

    const isExpired = new Date() > new Date(banExpiresAt);
    if (isExpired) {
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          ban: { delete: true },
        },
      });
      return true;
    }

    return false;
  }

  private async createAndStoreTokenPair(
    userId: string,
    role: SiteRole,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const tokens = await this.tokensService.createTokenPair({
      sub: userId,
      role,
    });
    await this.prismaService.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId,
        ip,
        userAgent,
        expiresAt: new Date(
          Date.now() + this.tokensService.getRefreshTokenExpiresInMs(),
        ),
      },
    });
    return tokens;
  }

  private async findLegacyUserByEmail(
    email: string,
  ): Promise<LegacyUser | null> {
    return this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        password: true,
        createdAt: true,
        ban: { select: { banType: true, banReason: true, banExpiresAt: true } },
        userProfile: {
          select: {
            id: true,
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
  }

  private async findLegacyUserById(id: string): Promise<LegacyUser | null> {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        ban: { select: { banType: true, banReason: true, banExpiresAt: true } },
        userProfile: {
          select: {
            id: true,
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
  }
}
