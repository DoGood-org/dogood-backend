import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request, CookieOptions } from 'express';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';
  }

  setCookie(
    res: Response,
    name: string,
    value: string,
    options?: CookieOptions,
  ): void {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/',
      ...options,
    };

    res.cookie(name, value, defaultOptions);
  }

  getCookie(req: Request, name: string): string | undefined {
    return req.cookies?.[name] as string | undefined;
  }

  clearCookie(res: Response, name: string, options?: CookieOptions): void {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/',
      ...options,
    };

    res.clearCookie(name, defaultOptions);
  }

  clearAllCookies(res: Response, cookieNames: string[]): void {
    cookieNames.forEach((name) => {
      this.clearCookie(res, name);
    });
  }

  setAuthTokens(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    this.setCookie(res, 'accessToken', accessToken, {
      maxAge: 15 * 60 * 1000,
    });
    this.setCookie(res, 'refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
