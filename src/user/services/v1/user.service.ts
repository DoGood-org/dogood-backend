import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { LocationService } from 'src/location/services/location.service';
import { UserMapperV1 } from 'src/user/mappers/v1/user.mapper';
import {
  FullUserV1,
  PublicUserV1,
  SearchUsersByNameDataV1,
  UpdateUserProfileDataV1,
  UpdateUserSettingsDataV1,
  UserDeletedResponseV1,
  UserMessageResponseV1,
  UserNameV1,
  UserResponseV1,
} from 'src/user/interfaces/user';

@Injectable()
export class UserServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly userMapper: UserMapperV1,
  ) {}

  async getFullUser(id: string): Promise<FullUserV1 | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        status: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
        ban: {
          select: {
            banType: true,
            banReason: true,
            banExpiresAt: true,
            bannedById: true,
          },
        },
        userSettings: {
          select: { id: true, userId: true, theme: true, language: true },
        },
        userProfile: {
          select: {
            id: true,
            userId: true,
            bio: true,
            avatar: true,
            gender: true,
            birthDate: true,
            phoneNumber: true,
          },
        },
        userLocation: {
          select: {
            location: {
              select: { id: true, country: true, region: true, city: true },
            },
          },
        },
        taskParticipations: {
          where: { deletedAt: null, task: { deletedAt: null } },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                hostId: true,
                startDate: true,
                endDate: true,
                status: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: {
                  select: { name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
        hostProfile: {
          select: {
            tasks: {
              where: { deletedAt: null },
              orderBy: [
                { createdAt: Prisma.SortOrder.asc },
                { id: Prisma.SortOrder.asc },
              ],
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                hostId: true,
                startDate: true,
                endDate: true,
                status: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: {
                  select: { name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
        userReviewsWritten: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            targetUserId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        orgReviewsWritten: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            targetOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        taskReviewsWritten: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            taskId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        systemReviewsWritten: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        reviewsReceived: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            targetUserId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        organizations: {
          where: { deletedAt: null, organization: { deletedAt: null } },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            role: true,
            status: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                description: true,
                createdAt: true,
                _count: {
                  select: { members: { where: { deletedAt: null } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.userMapper.toFullUser(user);
  }

  async getUserProfileById(
    id: string,
  ): Promise<UserResponseV1<{ user: FullUserV1 }>> {
    const user = await this.getFullUser(id);

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    return this.userMapper.toUserResponse(
      { user },
      SuccessCode.USER_PROFILE_RETRIEVED,
    );
  }

  async getPublicUserProfileById(
    id: string,
  ): Promise<UserResponseV1<{ user: PublicUserV1 }>> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        createdAt: true,
        userProfile: {
          select: {
            id: true,
            userId: true,
            bio: true,
            avatar: true,
            gender: true,
            birthDate: true,
            phoneNumber: true,
          },
        },
        userLocation: {
          select: {
            location: {
              select: { id: true, country: true, region: true, city: true },
            },
          },
        },
        taskParticipations: {
          where: { deletedAt: null, task: { deletedAt: null } },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                hostId: true,
                startDate: true,
                endDate: true,
                status: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: {
                  select: { name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
        hostProfile: {
          select: {
            tasks: {
              where: { deletedAt: null },
              orderBy: [
                { createdAt: Prisma.SortOrder.asc },
                { id: Prisma.SortOrder.asc },
              ],
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                hostId: true,
                startDate: true,
                endDate: true,
                status: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: {
                  select: { name: true, latitude: true, longitude: true },
                },
              },
            },
          },
        },
        reviewsReceived: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            targetUserId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            authorUser: {
              select: { name: true, userProfile: { select: { avatar: true } } },
            },
          },
        },
        organizations: {
          where: { deletedAt: null, organization: { deletedAt: null } },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          select: {
            role: true,
            status: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                description: true,
                createdAt: true,
                _count: {
                  select: { members: { where: { deletedAt: null } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    return this.userMapper.toUserResponse(
      { user: this.userMapper.toPublicUser(user) },
      SuccessCode.USER_PROFILE_RETRIEVED,
    );
  }

  async updateMyProfile(
    userId: string,
    data: UpdateUserProfileDataV1,
  ): Promise<UserResponseV1<{ user: FullUserV1 | null }>> {
    const {
      name,
      bio,
      avatar,
      location,
      gender,
      birthDate,
      phoneNumber,
      stripeCustomerId,
    } = data;
    const profileData = { bio, avatar, gender, birthDate, phoneNumber };

    // NOTE: legacy upserts the profile on every call, even when no profile field was sent.
    await this.prisma.user.update({
      where: { id: userId, deletedAt: null },
      data: {
        name,
        stripeCustomerId,
        userProfile: {
          upsert: { create: profileData, update: profileData },
        },
      },
      select: { id: true },
    });

    if (location) {
      const { country, region, city } = location;

      // NOTE: legacy upserted the shared Location row in place; the reference is create-only now,
      // so the owner row (UserLocation) is repointed instead.
      await this.locationService.setUserLocation(userId, {
        country: country ?? '',
        region: region ?? '',
        city: city ?? '',
        name: null,
        latitude: null,
        longitude: null,
      });
    }

    const user = await this.getFullUser(userId);

    return this.userMapper.toUserResponse(
      { user },
      SuccessCode.USER_PROFILE_UPDATED,
    );
  }

  async updateMySettings(
    userId: string,
    data: UpdateUserSettingsDataV1,
  ): Promise<UserResponseV1<{ settings: Record<string, never> }>> {
    const { theme, language } = data;

    await this.prisma.userSettings.upsert({
      where: { userId },
      update: { theme, language },
      create: { userId, theme, language },
      select: { id: true },
    });

    // NOTE: legacy answered `settings: userServices` — the service object, which serializes to `{}`.
    return this.userMapper.toUserResponse(
      { settings: {} },
      SuccessCode.USER_SETTINGS_UPDATED,
    );
  }

  async deleteMyProfile(userId: string): Promise<UserDeletedResponseV1> {
    await this.prisma.$transaction(async (tx) => {
      const host = await tx.host.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (host) {
        await tx.task.deleteMany({ where: { hostId: host.id } });
      }

      // NOTE: these two relations have no ON DELETE CASCADE, so they would block the user delete.
      await tx.chatMessageReaction.deleteMany({ where: { userId } });
      await tx.readStatus.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId }, select: { id: true } });
      // NOTE: legacy also removed orphaned Location rows; the reference is create-only now and is never deleted.
    });

    return this.userMapper.toUserDeletedResponse();
  }

  async searchUsersByName(
    data: SearchUsersByNameDataV1,
  ): Promise<UserMessageResponseV1<{ users: UserNameV1[] }>> {
    const { name } = data;

    if (!name) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Name query is required',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        name: { contains: name, mode: Prisma.QueryMode.insensitive },
      },
      orderBy: [{ name: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
      select: {
        id: true,
        name: true,
        userProfile: { select: { avatar: true } },
      },
      take: 10,
    });

    if (users.length === 0) {
      return this.userMapper.toUserMessageResponse(
        { users: [] },
        SuccessCode.USER_DATA_RETRIEVED,
        'No users found with this name',
      );
    }

    return this.userMapper.toUserMessageResponse(
      { users: users.map((user) => this.userMapper.toUserName(user)) },
      SuccessCode.USER_DATA_RETRIEVED,
      'Users retrieved successfully',
    );
  }
}
