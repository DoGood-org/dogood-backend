import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { UserV2Mapper } from 'src/user/mappers/user-v2.mapper';
import {
  PublicUserProfileV2,
  UserProfileV2,
} from 'src/user/interfaces/v2/user-profile';
import {
  UpdateUserLocationV2,
  UpdateUserProfileV2,
} from 'src/user/interfaces/v2/update-user-profile';
import {
  UpdateUserSettingsV2,
  UserSettingsV2,
} from 'src/user/interfaces/v2/user-settings';
import {
  GetUserProfilesV2,
  UserSortField,
  UserV2,
} from 'src/user/interfaces/v2/get-user-profiles';

@Injectable()
export class UserV2Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userMapper: UserV2Mapper,
  ) {}

  async getProfile(userId: string): Promise<UserProfileV2> {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        userProfile: {
          select: {
            bio: true,
            avatar: true,
            gender: true,
            birthDate: true,
            phoneNumber: true,
          },
        },
        userSettings: { select: { id: true, theme: true, language: true } },
        location: {
          select: { id: true, country: true, region: true, city: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userMapper.toProfile(user);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfileV2> {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, deletedAt: null, status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userProfile: { select: { bio: true, avatar: true, gender: true } },
        location: {
          select: { id: true, country: true, region: true, city: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.userMapper.toPublicProfile(user);
  }

  async updateProfile(
    userId: string,
    data: UpdateUserProfileV2,
  ): Promise<UserProfileV2> {
    const { name, location, bio, avatar, gender, birthDate, phoneNumber } =
      data;

    const profileData = { bio, avatar, gender, birthDate, phoneNumber };
    const hasProfileData = Object.values(profileData).some(
      (value) => value !== undefined,
    );

    // undefined — локацію не чіпаємо, null — очищаємо, обʼєкт — знаходимо/створюємо.
    const locationId =
      location === undefined
        ? undefined
        : location === null
          ? null
          : await this.resolveLocationId(location);

    try {
      const user = await this.prismaService.user.update({
        where: { id: userId, deletedAt: null },
        data: {
          name,
          locationId,
          userProfile: hasProfileData
            ? { upsert: { create: profileData, update: profileData } }
            : undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          userProfile: {
            select: {
              bio: true,
              avatar: true,
              gender: true,
              birthDate: true,
              phoneNumber: true,
            },
          },
          userSettings: { select: { id: true, theme: true, language: true } },
          location: {
            select: { id: true, country: true, region: true, city: true },
          },
        },
      });

      return this.userMapper.toProfile(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Phone number already in use');
        }
      }
      throw error;
    }
  }

  /** upsert, бо в користувачів, створених до появи налаштувань, рядка може не бути. */
  async updateSettings(
    userId: string,
    data: UpdateUserSettingsV2,
  ): Promise<UserSettingsV2> {
    return this.prismaService.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: { id: true, theme: true, language: true },
    });
  }

  /**
   * Мʼяке видалення: гасимо акаунт і всі активні refresh-токени за один раунд-тріп.
   * updateMany замість update — повторний виклик має лишатись безпечним.
   */
  async deleteAccount(userId: string): Promise<void> {
    const deletedAt = new Date();

    await this.prismaService.$transaction([
      this.prismaService.user.updateMany({
        where: { id: userId, deletedAt: null },
        data: { deletedAt },
      }),
      this.prismaService.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deletedAt },
      }),
    ]);
  }

  async getUserProfiles(query: GetUserProfilesV2): Promise<UserV2[]> {
    const {
      search,
      sort = UserSortField.NAME,
      sortDirection = Prisma.SortOrder.asc,
      skip = 0,
      limit = 20,
    } = query;

    const users = await this.prismaService.user.findMany({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        name: search
          ? { contains: search, mode: Prisma.QueryMode.insensitive }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        userProfile: { select: { avatar: true } },
      },
      orderBy: [{ [sort]: sortDirection }, { id: Prisma.SortOrder.asc }],
      skip,
      take: limit,
    });

    return users.map((user) => this.userMapper.toUser(user));
  }

  private async resolveLocationId(
    location: UpdateUserLocationV2,
  ): Promise<string> {
    const { country = null, region = null, city = null } = location;

    const existing = await this.prismaService.location.findFirst({
      where: { country, region, city },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prismaService.location.create({
      data: { country, region, city },
      select: { id: true },
    });

    return created.id;
  }
}
