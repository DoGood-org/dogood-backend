import { HttpStatus } from '@nestjs/common';
import { Gender, Prisma, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { LocationService } from 'src/location/services/location.service';
import { FullUserRowV1, PublicUserRowV1 } from 'src/user/interfaces/user';
import { UserMapperV1 } from 'src/user/mappers/v1/user.mapper';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

const catchV1Exception = async (
  promise: Promise<unknown>,
): Promise<V1ApiException> => {
  const error: unknown = await promise.catch((e: unknown) => e);

  expect(error).toBeInstanceOf(V1ApiException);

  return error as V1ApiException;
};

describe('UserServiceV1', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userSettings: { upsert: jest.fn() },
    host: { findUnique: jest.fn() },
    task: { deleteMany: jest.fn() },
    chatMessageReaction: { deleteMany: jest.fn() },
    readStatus: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const locationService = { setUserLocation: jest.fn() };
  const service = new UserServiceV1(
    prisma as unknown as PrismaService,
    locationService as unknown as LocationService,
    new UserMapperV1(),
  );
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const fullRow: FullUserRowV1 = {
    id: 'user-1',
    email: 'ann@b.co',
    name: 'Ann',
    role: SiteRole.USER,
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    stripeCustomerId: null,
    createdAt,
    updatedAt: createdAt,
    ban: null,
    userSettings: null,
    userProfile: null,
    userLocation: null,
    taskParticipations: [],
    hostProfile: null,
    userReviewsWritten: [],
    orgReviewsWritten: [],
    taskReviewsWritten: [],
    systemReviewsWritten: [],
    reviewsReceived: [],
    organizations: [],
  };
  const publicRow: PublicUserRowV1 = {
    id: 'user-1',
    name: 'Ann',
    createdAt,
    userProfile: null,
    userLocation: null,
    taskParticipations: [],
    hostProfile: null,
    reviewsReceived: [],
    organizations: [],
  };

  const expectNotFound = (error: V1ApiException): void => {
    expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(error.getResponse()).toEqual({
      status: 'error',
      statusCode: HttpStatus.NOT_FOUND,
      code: ErrorCode.USER_NOT_FOUND,
      message: 'User not found',
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
  });

  describe('getFullUser', () => {
    it('should answer null for a missing or soft-deleted user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getFullUser('user-1')).resolves.toBeNull();
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1', deletedAt: null } }),
      );
    });

    it('should never select a secret column', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await service.getFullUser('user-1');

      const [{ select }] = prisma.user.findFirst.mock.calls[0] as [
        { select: Record<string, unknown> },
      ];

      expect(select).not.toHaveProperty('password');
      expect(select).not.toHaveProperty('emailVerificationCode');
      expect(select).not.toHaveProperty('resetPasswordToken');
      expect(select).not.toHaveProperty('refreshTokens');
    });

    it('should skip soft-deleted tasks, participations, memberships and organizations', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await service.getFullUser('user-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            taskParticipations: expect.objectContaining({
              where: { deletedAt: null, task: { deletedAt: null } },
            }),
            hostProfile: {
              select: {
                tasks: expect.objectContaining({ where: { deletedAt: null } }),
              },
            },
            organizations: expect.objectContaining({
              where: { deletedAt: null, organization: { deletedAt: null } },
            }),
          }),
        }),
      );
    });

    it('should order every list with a unique tiebreaker', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await service.getFullUser('user-1');

      const [{ select }] = prisma.user.findFirst.mock.calls[0] as [
        { select: Record<string, { orderBy?: unknown }> },
      ];
      const orderBy = [
        { createdAt: Prisma.SortOrder.asc },
        { id: Prisma.SortOrder.asc },
      ];

      for (const relation of [
        'taskParticipations',
        'userReviewsWritten',
        'orgReviewsWritten',
        'taskReviewsWritten',
        'systemReviewsWritten',
        'reviewsReceived',
        'organizations',
      ]) {
        expect(select[relation].orderBy).toEqual(orderBy);
      }
    });

    it('should answer the mapped legacy user', async () => {
      prisma.user.findFirst.mockResolvedValue(fullRow);

      await expect(service.getFullUser('user-1')).resolves.toMatchObject({
        id: 'user-1',
        siteRole: SiteRole.USER,
        tasks: [],
      });
    });
  });

  describe('getUserProfileById', () => {
    it('should answer 404 USER_NOT_FOUND for a missing user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      expectNotFound(
        await catchV1Exception(service.getUserProfileById('user-1')),
      );
    });

    it('should wrap the full user in the USER_PROFILE_RETRIEVED envelope', async () => {
      prisma.user.findFirst.mockResolvedValue(fullRow);

      const result = await service.getUserProfileById('user-1');

      expect(result.status).toBe('success');
      expect(result.code).toBe(SuccessCode.USER_PROFILE_RETRIEVED);
      expect(result.data.user).toMatchObject({
        id: 'user-1',
        email: 'ann@b.co',
      });
    });
  });

  describe('getPublicUserProfileById', () => {
    it('should answer 404 USER_NOT_FOUND for a missing user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      expectNotFound(
        await catchV1Exception(service.getPublicUserProfileById('user-1')),
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1', deletedAt: null } }),
      );
    });

    it('should not select private columns', async () => {
      prisma.user.findFirst.mockResolvedValue(publicRow);

      await service.getPublicUserProfileById('user-1');

      const [{ select }] = prisma.user.findFirst.mock.calls[0] as [
        { select: Record<string, unknown> },
      ];

      for (const column of [
        'email',
        'password',
        'userSettings',
        'stripeCustomerId',
        'refreshTokens',
      ]) {
        expect(select).not.toHaveProperty(column);
      }
    });

    it('should wrap the public user in the USER_PROFILE_RETRIEVED envelope', async () => {
      prisma.user.findFirst.mockResolvedValue(publicRow);

      await expect(
        service.getPublicUserProfileById('user-1'),
      ).resolves.toMatchObject({
        status: 'success',
        code: SuccessCode.USER_PROFILE_RETRIEVED,
        data: { user: { id: 'user-1', name: 'Ann', tasks: [] } },
      });
    });
  });

  describe('updateMyProfile', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue(fullRow);
    });

    it('should write name and stripeCustomerId on the user and upsert the profile fields', async () => {
      const birthDate = new Date('1990-01-01T00:00:00Z');

      await service.updateMyProfile('user-1', {
        name: 'Anna',
        bio: null,
        avatar: '',
        gender: Gender.FEMALE,
        birthDate,
        phoneNumber: '+380671234567',
        stripeCustomerId: 'cus_1',
        location: null,
      });

      const profile = {
        bio: null,
        avatar: '',
        gender: Gender.FEMALE,
        birthDate,
        phoneNumber: '+380671234567',
      };

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
        data: {
          name: 'Anna',
          stripeCustomerId: 'cus_1',
          userProfile: { upsert: { create: profile, update: profile } },
        },
        select: { id: true },
      });
    });

    it('should upsert the profile even for an empty body (legacy)', async () => {
      await service.updateMyProfile('user-1', {});

      const profile = {
        bio: undefined,
        avatar: undefined,
        gender: undefined,
        birthDate: undefined,
        phoneNumber: undefined,
      };

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: undefined,
            stripeCustomerId: undefined,
            userProfile: { upsert: { create: profile, update: profile } },
          },
        }),
      );
    });

    it.each([undefined, null])(
      'should leave the location alone when it is %p',
      async (location) => {
        await service.updateMyProfile('user-1', { location });

        expect(locationService.setUserLocation).not.toHaveBeenCalled();
      },
    );

    it('should repoint the user location after the user update, filling missing parts with empty strings', async () => {
      await service.updateMyProfile('user-1', {
        location: { country: 'Ukraine', region: null, city: 'Kyiv' },
      });

      expect(locationService.setUserLocation).toHaveBeenCalledWith('user-1', {
        country: 'Ukraine',
        region: '',
        city: 'Kyiv',
        name: null,
        latitude: null,
        longitude: null,
      });

      const [updateOrder] = prisma.user.update.mock.invocationCallOrder;
      const [locationOrder] =
        locationService.setUserLocation.mock.invocationCallOrder;

      expect(updateOrder).toBeLessThan(locationOrder);
    });

    it('should answer the re-read full user in the USER_PROFILE_UPDATED envelope', async () => {
      const result = await service.updateMyProfile('user-1', { name: 'Ann' });

      expect(result.code).toBe(SuccessCode.USER_PROFILE_UPDATED);
      expect(result.data.user).toMatchObject({ id: 'user-1' });

      const [updateOrder] = prisma.user.update.mock.invocationCallOrder;
      const [readOrder] = prisma.user.findFirst.mock.invocationCallOrder;

      expect(updateOrder).toBeLessThan(readOrder);
    });
  });

  describe('updateMySettings', () => {
    it('should upsert theme and language for the caller only', async () => {
      await service.updateMySettings('user-1', {
        theme: 'light',
        language: 'de',
      });

      expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { theme: 'light', language: 'de' },
        create: { userId: 'user-1', theme: 'light', language: 'de' },
        select: { id: true },
      });
    });

    it('should answer settings: {} (legacy serialized the service object)', async () => {
      await expect(
        service.updateMySettings('user-1', { theme: 'dark' }),
      ).resolves.toEqual({
        status: 'success',
        code: SuccessCode.USER_SETTINGS_UPDATED,
        data: { settings: {} },
      });
    });
  });

  describe('deleteMyProfile', () => {
    it('should delete hosted tasks, blocking chat rows and then the user in one transaction', async () => {
      prisma.host.findUnique.mockResolvedValue({ id: 'host-1' });

      await expect(service.deleteMyProfile('user-1')).resolves.toEqual({
        status: 'success',
        code: SuccessCode.USER_DELETED,
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.host.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { id: true },
      });
      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { hostId: 'host-1' },
      });
      expect(prisma.chatMessageReaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.readStatus.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true },
      });

      const [userDeleteOrder] = prisma.user.delete.mock.invocationCallOrder;

      for (const deleteMany of [
        prisma.task.deleteMany,
        prisma.chatMessageReaction.deleteMany,
        prisma.readStatus.deleteMany,
      ]) {
        expect(deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
          userDeleteOrder,
        );
      }
    });

    it('should skip the task delete for a user who never hosted', async () => {
      prisma.host.findUnique.mockResolvedValue(null);

      await service.deleteMyProfile('user-1');

      expect(prisma.task.deleteMany).not.toHaveBeenCalled();
      expect(prisma.user.delete).toHaveBeenCalledTimes(1);
    });

    it('should propagate a failure from inside the transaction', async () => {
      const failure = new Error('db down');
      prisma.host.findUnique.mockResolvedValue(null);
      prisma.user.delete.mockRejectedValue(failure);

      await expect(service.deleteMyProfile('user-1')).rejects.toBe(failure);
    });
  });

  describe('searchUsersByName', () => {
    it.each([undefined, ''])(
      'should answer 400 VALIDATION_ERROR for name %p without querying',
      async (name) => {
        const error = await catchV1Exception(
          service.searchUsersByName({ name }),
        );

        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toEqual({
          status: 'error',
          statusCode: HttpStatus.BAD_REQUEST,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Name query is required',
        });
        expect(prisma.user.findMany).not.toHaveBeenCalled();
      },
    );

    it('should search live users case-insensitively, 10 at most, in a stable order', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.searchUsersByName({ name: 'an' });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          name: { contains: 'an', mode: Prisma.QueryMode.insensitive },
        },
        orderBy: [
          { name: Prisma.SortOrder.asc },
          { id: Prisma.SortOrder.asc },
        ],
        select: {
          id: true,
          name: true,
          userProfile: { select: { avatar: true } },
        },
        take: 10,
      });
    });

    it('should answer the "No users found" message with an empty list', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await expect(
        service.searchUsersByName({ name: 'zz' }),
      ).resolves.toEqual({
        status: 'success',
        code: SuccessCode.USER_DATA_RETRIEVED,
        message: 'No users found with this name',
        data: { users: [] },
      });
    });

    it('should answer the found users with flattened avatars', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Ann', userProfile: { avatar: 'a.png' } },
        { id: 'user-2', name: 'Anna', userProfile: null },
      ]);

      await expect(
        service.searchUsersByName({ name: 'an' }),
      ).resolves.toEqual({
        status: 'success',
        code: SuccessCode.USER_DATA_RETRIEVED,
        message: 'Users retrieved successfully',
        data: {
          users: [
            { id: 'user-1', name: 'Ann', avatar: 'a.png' },
            { id: 'user-2', name: 'Anna', avatar: null },
          ],
        },
      });
    });
  });
});
