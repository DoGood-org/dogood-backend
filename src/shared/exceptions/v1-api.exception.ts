import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@shared/constants/api-codes';

export type BannedUserPayload = {
  id: string;
  createdAt: Date;
  ban?: {
    banType: string;
    banReason: string | null;
    banExpiresAt: Date | null;
  } | null;
};

export class V1ApiException extends HttpException {
  constructor(
    statusCode: HttpStatus,
    message: string,
    code: ErrorCode,
    payload?: Record<string, unknown>,
  ) {
    super(
      payload ?? {
        status: 'error',
        statusCode,
        code,
        message,
      },
      statusCode,
    );
  }

  // NOTE: the legacy message differs by call site — 'Access denied. Account suspended.' on
  // login and refresh (develop:src/controllers/auth.controller.ts:90,439), 'Your account has
  // been suspended' in the auth middleware (develop:src/middlewares/auth.middleware.ts:41).
  static banned(
    user: BannedUserPayload,
    message = 'Access denied. Account suspended.',
  ): V1ApiException {
    return new V1ApiException(
      HttpStatus.FORBIDDEN,
      message,
      ErrorCode.USER_WAS_BANNED,
      {
        message,
        code: ErrorCode.USER_WAS_BANNED,
        bannedUser: {
          accountId: user.id,
          suspendedOn: user.createdAt,
          suspensionType: user.ban?.banType ?? null,
          reason:
            user.ban?.banReason ??
            'Access restricted due to a community guidelines violation',
          banExpiresAt: user.ban?.banExpiresAt ?? null,
        },
      },
    );
  }
}
