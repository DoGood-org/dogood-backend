import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Request, Response } from 'express';
import { ErrorCode } from '@shared/constants/api-codes';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { CookieService } from '@shared/services/cookie.service';
import { AuthControllerV1 } from 'src/auth/controllers/v1/auth.controller';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; nothing here signs tokens.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('AuthControllerV1', () => {
  const authService = {
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
  };
  const cookieService = {
    getCookie: jest.fn(),
    setAuthTokens: jest.fn(),
    clearAllCookies: jest.fn(),
  };
  const controller = new AuthControllerV1(
    authService as unknown as AuthServiceV1,
    cookieService as unknown as CookieService,
  );
  const request = {} as Request;
  const response = {} as Response;
  const session = {
    accessToken: 'access',
    refreshToken: 'refresh',
    refreshTokenMaxAgeMs: 1000,
  };
  const bannedError = V1ApiException.banned({
    id: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ban: null,
  });
  const otherError = new V1ApiException(
    HttpStatus.BAD_REQUEST,
    'Invalid email or password',
    ErrorCode.AUTH_INVALID_CREDENTIALS,
  );
  const loginData = { email: 'ann@b.co', password: 'secret' };

  const metadataOf = (key: string, name: keyof AuthControllerV1): unknown =>
    Reflect.getMetadata(
      key,
      Object.getOwnPropertyDescriptor(AuthControllerV1.prototype, name)
        ?.value,
    );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('routes', () => {
    it.each<[keyof AuthControllerV1, string, HttpStatus]>([
      ['signup', 'signup', HttpStatus.CREATED],
      ['login', 'login', HttpStatus.OK],
      ['logout', 'logout', HttpStatus.NO_CONTENT],
      ['verifyEmail', 'verify-email/:verificationCode', HttpStatus.OK],
      ['resendVerificationEmail', 'resend-verification', HttpStatus.OK],
      ['refreshTokens', 'refresh-token', HttpStatus.OK],
      ['forgotPassword', 'forgot-password', HttpStatus.OK],
      ['resetPassword', 'reset-password/:resetPasswordToken', HttpStatus.OK],
      ['resendResetPassword', 'resent-forgot-password', HttpStatus.OK],
    ])(
      'should keep %s public at the legacy path %p with %p',
      (name, path, status) => {
        expect(metadataOf(IS_PUBLIC_KEY, name)).toBe(true);
        expect(metadataOf(PATH_METADATA, name)).toBe(path);
        expect(metadataOf(HTTP_CODE_METADATA, name)).toBe(status);
      },
    );

    it('should keep current-user behind the global AuthGuard', () => {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthControllerV1)).toBe(
        undefined,
      );
      expect(metadataOf(IS_PUBLIC_KEY, 'getCurrentUser')).toBe(undefined);
      expect(metadataOf(PATH_METADATA, 'getCurrentUser')).toBe(
        'current-user',
      );
    });
  });

  describe('login', () => {
    it('should set both cookies from the session and answer the body', async () => {
      const body = { message: 'ok' };
      authService.login.mockResolvedValue({ response: body, session });

      await expect(
        controller.login(loginData, '1.2.3.4', 'agent', response),
      ).resolves.toBe(body);
      expect(authService.login).toHaveBeenCalledWith(loginData, {
        ip: '1.2.3.4',
        userAgent: 'agent',
      });
      expect(cookieService.setAuthTokens).toHaveBeenCalledWith(
        response,
        'access',
        'refresh',
        1000,
      );
    });

    it('should clear both cookies and rethrow for a banned user', async () => {
      authService.login.mockRejectedValue(bannedError);

      await expect(
        controller.login(loginData, '1.2.3.4', undefined, response),
      ).rejects.toBe(bannedError);
      expect(cookieService.clearAllCookies).toHaveBeenCalledWith(response, [
        'accessToken',
        'refreshToken',
      ]);
    });

    it('should leave cookies alone for any other error', async () => {
      authService.login.mockRejectedValue(otherError);

      await expect(
        controller.login(loginData, '1.2.3.4', undefined, response),
      ).rejects.toBe(otherError);
      expect(cookieService.clearAllCookies).not.toHaveBeenCalled();
      expect(cookieService.setAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke by the refresh cookie and then clear both cookies', async () => {
      cookieService.getCookie.mockReturnValue('refresh-1');

      await controller.logout(request, response);

      expect(cookieService.getCookie).toHaveBeenCalledWith(
        request,
        'refreshToken',
      );
      expect(authService.logout).toHaveBeenCalledWith('refresh-1');
      expect(cookieService.clearAllCookies).toHaveBeenCalledWith(response, [
        'accessToken',
        'refreshToken',
      ]);
    });

    it('should keep the cookies when the logout fails', async () => {
      authService.logout.mockRejectedValue(otherError);

      await expect(controller.logout(request, response)).rejects.toBe(
        otherError,
      );
      expect(cookieService.clearAllCookies).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should set the rotated cookies', async () => {
      const body = { message: 'Tokens refreshed successfully' };
      cookieService.getCookie.mockReturnValue('refresh-1');
      authService.refreshTokens.mockResolvedValue({ response: body, session });

      await expect(
        controller.refreshTokens(request, '1.2.3.4', 'agent', response),
      ).resolves.toBe(body);
      expect(authService.refreshTokens).toHaveBeenCalledWith('refresh-1', {
        ip: '1.2.3.4',
        userAgent: 'agent',
      });
      expect(cookieService.setAuthTokens).toHaveBeenCalledWith(
        response,
        'access',
        'refresh',
        1000,
      );
    });

    it('should set no cookies on "Tokens already refreshed"', async () => {
      const body = { message: 'Tokens already refreshed' };
      authService.refreshTokens.mockResolvedValue({
        response: body,
        session: null,
      });

      await expect(
        controller.refreshTokens(request, '1.2.3.4', undefined, response),
      ).resolves.toBe(body);
      expect(cookieService.setAuthTokens).not.toHaveBeenCalled();
    });

    it('should clear both cookies and rethrow for a banned user', async () => {
      authService.refreshTokens.mockRejectedValue(bannedError);

      await expect(
        controller.refreshTokens(request, '1.2.3.4', undefined, response),
      ).rejects.toBe(bannedError);
      expect(cookieService.clearAllCookies).toHaveBeenCalledTimes(1);
    });

    it('should leave cookies alone for an invalid token', async () => {
      authService.refreshTokens.mockRejectedValue(otherError);

      await expect(
        controller.refreshTokens(request, '1.2.3.4', undefined, response),
      ).rejects.toBe(otherError);
      expect(cookieService.clearAllCookies).not.toHaveBeenCalled();
    });
  });
});
