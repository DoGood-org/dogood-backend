import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  sub: string;
  siteRole: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokensService {
  private readonly accessTokenSecret: Uint8Array;
  private readonly refreshTokenSecret: Uint8Array;
  private readonly accessTokenExpires: string;
  private readonly refreshTokenExpires: string;

  constructor(private readonly configService: ConfigService) {
    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    this.accessTokenSecret = new TextEncoder().encode(accessSecret);
    this.refreshTokenSecret = new TextEncoder().encode(refreshSecret);

    this.accessTokenExpires = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES',
      '15m',
    );
    this.refreshTokenExpires = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES',
      '7d',
    );
  }

  async createAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({
      sub: payload.sub,
      siteRole: payload.siteRole,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessTokenExpires)
      .sign(this.accessTokenSecret);
  }

  async createRefreshToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({
      sub: payload.sub,
      siteRole: payload.siteRole,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshTokenExpires)
      .sign(this.refreshTokenSecret);
  }

  async createTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(payload),
      this.createRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.accessTokenSecret);
      return {
        sub: payload.sub as string,
        siteRole: payload.siteRole as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.refreshTokenSecret);
      return {
        sub: payload.sub as string,
        siteRole: payload.siteRole as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  getRefreshTokenExpiresInMs(): number {
    const expires = this.refreshTokenExpires;
    const match = expires.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return numValue * 1000;
      case 'm':
        return numValue * 60 * 1000;
      case 'h':
        return numValue * 60 * 60 * 1000;
      case 'd':
        return numValue * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
