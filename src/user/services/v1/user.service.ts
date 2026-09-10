import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { UserDataMapperV1 } from 'src/user/data-mappers/v1/user.data-mapper';
import {
  fullUserSelectV1,
  publicUserSelectV1,
  PublicUserProfileV1,
  UpdateUserProfileV1,
  UpdateUserSettingsV1,
  UserProfileV1,
  userSearchSelectV1,
  UserSearchResultV1,
  UserSettingsV1,
} from 'src/user/interfaces/v1/user';

@Injectable()
export class UserServiceV1 {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userDataMapper: UserDataMapperV1,
  ) {}

  /** Port of develop:src/services/user.service.ts:37 `findFullUserById`. */
  async getUserProfileById(id: string): Promise<UserProfileV1> {
    const user = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null },
      select: fullUserSelectV1,
    });

    if (!user) {
      throw this.userNotFound();
    }

    return this.userDataMapper.toUserProfile(user);
  }

  /** Port of develop:src/services/user.service.ts:134 `findPublicProfileById`. */
  async getPublicUserProfileById(id: string): Promise<PublicUserProfileV1> {
    const user = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null },
      select: publicUserSelectV1,
    });

    if (!user) {
      throw this.userNotFound();
    }

    return this.userDataMapper.toPublicUserProfile(user);
  }

  /**
   * Port of develop:src/services/user.service.ts:212 `updateUserProfile` plus the second
   * read the legacy controller did afterwards (userProfile.controller.ts:78-80). The extra
   * round trip is legacy behaviour and stays in v1; v2 drops it.
   *
   * NOTE: the nested location `upsert` is the legacy statement verbatim
   * (develop:src/services/user.service.ts:224-232). `Location.users` is a list, so this
   * rewrites the shared row for every other user, organization and task pointing at it.
   * Reproduced knowingly — see ADR-0006; v2 resolves and connects instead.
   */
  async updateMyProfile(
    userId: string,
    input: UpdateUserProfileV1,
  ): Promise<UserProfileV1> {
    const { location, stripeCustomerId, name, ...profileData } = input;

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        name,
        stripeCustomerId,
        userProfile: { upsert: { create: profileData, update: profileData } },
        location: location
          ? { upsert: { create: location, update: location } }
          : undefined,
      },
    });

    return await this.getUserProfileById(userId);
  }

  /**
   * Soft delete, replacing the legacy hard delete (develop:src/services/user.service.ts:279).
   * Refresh tokens are revoked in the same transaction — see ADR-0004.
   *
   * NOTE: a row that is already gone or already soft-deleted is skipped instead of raising
   * P2025. The legacy `tx.user.delete` threw there, but `AuthGuard` resolves the caller on
   * every request, so no HTTP path reaches this branch and the v1 contract is unchanged.
   */
  async deleteMyProfile(userId: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      return;
    }

    const deletedAt = new Date();

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: userId },
        data: { deletedAt },
      }),
      this.prismaService.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      }),
    ]);
  }

  /**
   * Port of develop:src/services/user.service.ts:257 `updateUserSettings` — the same upsert.
   *
   * NOTE: the legacy response shipped `data: { settings: userServices }`, the service module
   * itself, which serialises to `{}` (develop:src/controllers/userProfile.controller.ts:108).
   * The real settings go out instead — approved deviation, see ADR-0009.
   */
  async updateMySettings(
    userId: string,
    input: UpdateUserSettingsV1,
  ): Promise<UserSettingsV1> {
    return await this.prismaService.userSettings.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
      select: { theme: true, language: true },
    });
  }

  /**
   * Port of develop:src/services/user.service.ts:308 `findUsersByName` plus the empty-name
   * guard the legacy controller ran first (userProfile.controller.ts:143). Case-insensitive
   * substring match, a hard `take: 10`, no ordering and no pagination — all legacy.
   *
   * NOTE: `deletedAt: null` has no legacy counterpart because the legacy delete was a hard
   * one; without the filter a soft-deleted account would start showing up in search, which
   * legacy never did.
   */
  async searchUsersByName(name?: string): Promise<UserSearchResultV1[]> {
    if (!name) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Name query is required',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const users = await this.prismaService.user.findMany({
      where: {
        deletedAt: null,
        name: { contains: name, mode: Prisma.QueryMode.insensitive },
      },
      select: userSearchSelectV1,
      take: 10,
    });

    return this.userDataMapper.toUserSearchResults(users);
  }

  private userNotFound(): V1ApiException {
    return new V1ApiException(
      HttpStatus.NOT_FOUND,
      'User not found',
      ErrorCode.USER_NOT_FOUND,
    );
  }
}
