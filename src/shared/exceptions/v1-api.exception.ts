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

export type SuspendedUserPayload = Omit<BannedUserPayload, 'createdAt'>;

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

  // NOTE: legacy `authenticateUser` body, not the login one: its `findAuthUser` never selected
  // `createdAt`, so `suspendedOn` is always the time of the request.
  static suspended(user: SuspendedUserPayload): V1ApiException {
    const { id, ban } = user;

    return new V1ApiException(
      HttpStatus.FORBIDDEN,
      'Your account has been suspended',
      ErrorCode.USER_WAS_BANNED,
      {
        message: 'Your account has been suspended',
        code: ErrorCode.USER_WAS_BANNED,
        bannedUser: {
          accountId: id,
          suspendedOn: new Date(),
          suspensionType: ban?.banType ?? null,
          reason:
            ban?.banReason ||
            'Access restricted due to a community guidelines violation',
          banExpiresAt: ban?.banExpiresAt ?? null,
        },
      },
    );
  }

  static banned(user: BannedUserPayload): V1ApiException {
    return new V1ApiException(
      HttpStatus.FORBIDDEN,
      'Access denied. Account suspended.',
      ErrorCode.USER_WAS_BANNED,
      {
        message: 'Access denied. Account suspended.',
        code: ErrorCode.USER_WAS_BANNED,
        bannedUser: {
          accountId: user.id,
          suspendedOn: user.createdAt,
          suspensionType: user.ban?.banType ?? null,
          // NOTE: `||` is the legacy formatter: an empty reason falls back too.
          reason:
            user.ban?.banReason ||
            'Access restricted due to a community guidelines violation',
          banExpiresAt: user.ban?.banExpiresAt ?? null,
        },
      },
    );
  }
}
