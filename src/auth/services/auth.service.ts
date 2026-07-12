import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { TokensService } from '@shared/services/tokens.service';
import { HashService } from '@shared/services/hash.service';
import { EmailService } from '@shared/services/email.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { SiteRole, UserStatus } from '@prisma/client';
import { getVerificationEmailHtml } from '@shared/templates/verification-email.template';
import { getResetPasswordEmailHtml } from '@shared/templates/reset-password-email.template';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokensService: TokensService,
    private readonly hashService: HashService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashService.hashPassword(
      registerDto.password,
    );

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          password: hashedPassword,
          siteRole: SiteRole.USER,
          emailVerificationCode: verificationCode,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          siteRole: true,
        },
      });

      await tx.userSettings.create({
        data: {
          userId: user.id,
          language: 'en', // Default language(need to connect with i18n service)
        },
      });

      return user;
    });

    const emailHtml = getVerificationEmailHtml(verificationCode);

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: emailHtml,
    });

    return user;
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('User is banned');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const isPasswordValid = await this.hashService.verifyPassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.tokensService.createTokenPair({
      sub: user.id,
      siteRole: user.siteRole,
    });

    const expiresInMs = this.tokensService.getRefreshTokenExpiresInMs();
    await this.prismaService.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        ip: ip,
        userAgent: userAgent,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        siteRole: user.siteRole,
      },
      tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prismaService.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }

  async refreshTokens(refreshToken: string, ip?: string, userAgent?: string) {
    await this.tokensService.verifyRefreshToken(refreshToken);

    const storedToken = await this.prismaService.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revoked: false,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prismaService.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = await this.tokensService.createTokenPair({
      sub: storedToken.user.id,
      siteRole: storedToken.user.siteRole,
    });

    const expiresInMs = this.tokensService.getRefreshTokenExpiresInMs();
    await this.prismaService.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.user.id,
        ip: ip,
        userAgent: userAgent,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return {
      tokens,
    };
  }

  async verifyEmail(code: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        emailVerificationCode: code,
        isEmailVerified: false,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Verification code has expired');
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        siteRole: true,
      },
    });

    return updatedUser;
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('Email is already verified');
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
    });

    const emailHtml = getVerificationEmailHtml(verificationCode);
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - DoGood',
      html: emailHtml,
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = crypto.randomUUID();
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiresAt: resetExpiresAt,
      },
    });

    const emailHtml = getResetPasswordEmailHtml(resetToken);
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - DoGood',
      html: emailHtml,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (
      user.resetPasswordExpiresAt &&
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Reset token has expired');
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
}
