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
    payload?: Record<string, any>,
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
          reason:
            user.ban?.banReason ??
            'Access restricted due to a community guidelines violation',
          banExpiresAt: user.ban?.banExpiresAt ?? null,
        },
      },
    );
  }
}
