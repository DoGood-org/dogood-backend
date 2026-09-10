import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { UserDataMapperV2 } from 'src/user/data-mappers/v2/user.data-mapper';
import {
  GetUserProfilesV2,
  publicUserProfileSelectV2,
  PublicUserProfileV2,
  UpdateMyProfileV2,
  UpdateMySettingsV2,
  userProfileSelectV2,
  UserProfileV2,
  UserSettingsV2,
  UserSortField,
} from 'src/user/interfaces/v2/user';

const RECORD_NOT_FOUND = 'P2025';
const UNIQUE_CONSTRAINT_FAILED = 'P2002';

@Injectable()
export class UserServiceV2 {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userDataMapper: UserDataMapperV2,
  ) {}

  /**
   * Replaces the legacy `POST /user/name`: the search travels in query params and the hard
   * `take: 10` becomes skip/limit. `id` is the tiebreaker — `name` and `createdAt` are not
   * unique, and without it rows duplicate or vanish between pages. No `total` is returned, a
   * short page is how the client detects the end.
   */
  async getUserProfiles(
    params: GetUserProfilesV2,
  ): Promise<PublicUserProfileV2[]> {
    const {
      search,
      sort = UserSortField.NAME,
      sortDirection = Prisma.SortOrder.asc,
      skip = 0,
      limit = 20,
    } = params;

    const users = await this.prismaService.user.findMany({
      where: {
        deletedAt: null,
        name: search
          ? { contains: search, mode: Prisma.QueryMode.insensitive }
          : undefined,
      },
      select: publicUserProfileSelectV2,
      orderBy: [{ [sort]: sortDirection }, { id: Prisma.SortOrder.asc }],
      skip,
      take: limit,
    });

    return users.map((user) => this.userDataMapper.toPublicUserProfile(user));
  }

  async getMyProfile(userId: string): Promise<UserProfileV2> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: userProfileSelectV2,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userDataMapper.toUserProfile(user);
  }

  async getUserProfileById(id: string): Promise<PublicUserProfileV2> {
    const user = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null, status: UserStatus.ACTIVE },
      select: publicUserProfileSelectV2,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userDataMapper.toPublicUserProfile(user);
  }

  async updateMyProfile(
    userId: string,
    input: UpdateMyProfileV2,
  ): Promise<UserProfileV2> {
    const { location, name, ...profileData } = input;
    const locationUpdate = await this.buildLocationUpdate(location);

    try {
      const user = await this.prismaService.user.update({
        where: { id: userId, deletedAt: null },
        data: {
          name,
          location: locationUpdate,
          userProfile: { upsert: { create: profileData, update: profileData } },
        },
        select: userProfileSelectV2,
      });

      return this.userDataMapper.toUserProfile(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === RECORD_NOT_FOUND) {
          throw new NotFoundException('User not found');
        }

        // NOTE: `UserProfile.phoneNumber` is the only unique column this endpoint writes, and
        // a soft-deleted row keeps holding its number (PRD decision 9), so a taken number is
        // ordinary user input and must not surface as a 500.
        if (error.code === UNIQUE_CONSTRAINT_FAILED) {
          throw new ConflictException('Phone number is already taken');
        }
      }

      throw error;
    }
  }

  /** Upsert, so settings are created on first write. Returns them flat, without a wrapper. */
  async updateMySettings(
    userId: string,
    input: UpdateMySettingsV2,
  ): Promise<UserSettingsV2> {
    return await this.prismaService.userSettings.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
      select: { theme: true, language: true },
    });
  }

  /** An already deleted or missing user is skipped, so the endpoint stays idempotent. */
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
        where: { id: userId, deletedAt: null },
        data: { deletedAt },
      }),
      this.prismaService.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      }),
    ]);
  }

  /**
   * `null` clears the location, an absent key leaves it alone. An object without a single
   * filled field carries no location either, so it clears it too — otherwise it would create
   * and share an all-`NULL` `Location` row and turn `location: null` into an empty object the
   * client has to tell apart. Locations are shared rows (`Location.users` is a list), so an
   * existing one is connected rather than rewritten.
   */
  private async buildLocationUpdate(
    location: UpdateMyProfileV2['location'],
  ): Promise<Prisma.UserUpdateInput['location']> {
    if (location === null) {
      return { disconnect: true };
    }

    if (!location) {
      return undefined;
    }

    const { country = null, region = null, city = null } = location;

    if (country === null && region === null && city === null) {
      return { disconnect: true };
    }

    const existing = await this.prismaService.location.findFirst({
      where: { country, region, city, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      return { connect: { id: existing.id } };
    }

    return { create: { country, region, city } };
  }
}
