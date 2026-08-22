import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Gender, Prisma, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { UserV2Mapper } from 'src/user/mappers/user-v2.mapper';
import { UserV2Service } from 'src/user/services/v2/user-v2.service';
import { UserSortField } from 'src/user/interfaces/v2/get-user-profiles';

/** Форма аргументу `user.update`, щоб діставати `data` з mock.calls типізовано. */
type UserUpdateCall = {
  where: { id: string; deletedAt: null };
  data: {
    name?: string;
    locationId?: string | null;
    userProfile?: unknown;
  };
};

describe('UserV2Service', () => {
  let service: UserV2Service;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userSettings: {
      upsert: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const userId = '11111111-1111-4111-8111-111111111111';
  const locationId = '33333333-3333-4333-8333-333333333333';
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  const location = {
    id: locationId,
    country: 'Ukraine',
    region: 'Lviv oblast',
    city: 'Lviv',
  };

  const profileRow = {
    id: userId,
    email: 'ada@dogood.org',
    name: 'Ada',
    role: SiteRole.USER,
    isEmailVerified: true,
    createdAt,
    userProfile: {
      bio: 'Counting things',
      avatar: 'https://cdn.dogood.org/ada.png',
      gender: Gender.FEMALE,
      birthDate: new Date('1815-12-10T00:00:00.000Z'),
      phoneNumber: '+380000000000',
    },
    userSettings: {
      id: '44444444-4444-4444-8444-444444444444',
      theme: 'dark',
      language: 'uk',
    },
    location,
  };

  const firstUpdateCall = (): UserUpdateCall =>
    mockPrismaService.user.update.mock.calls[0][0] as UserUpdateCall;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserV2Service,
        UserV2Mapper,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserV2Service>(UserV2Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should throw an error when the user is not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully return the mapped profile of an active user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(profileRow);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'ada@dogood.org',
        name: 'Ada',
        role: SiteRole.USER,
        isEmailVerified: true,
        createdAt,
        profile: profileRow.userProfile,
        settings: profileRow.userSettings,
        location,
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId, deletedAt: null } }),
      );
    });
  });

  describe('getPublicProfile', () => {
    it('should throw an error when the user is not found, deleted or inactive', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully return the public profile without email or role', async () => {
      const publicRow = {
        id: userId,
        name: 'Ada',
        createdAt,
        userProfile: {
          bio: 'Counting things',
          avatar: 'https://cdn.dogood.org/ada.png',
          gender: Gender.FEMALE,
        },
        location,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(publicRow);

      const result = await service.getPublicProfile(userId);

      expect(result).toEqual({
        id: userId,
        name: 'Ada',
        createdAt,
        profile: publicRow.userProfile,
        location,
      });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('role');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId, deletedAt: null, status: UserStatus.ACTIVE },
        }),
      );
    });
  });

  describe('updateProfile', () => {
    it('should throw an error when the user row is gone (P2025)', async () => {
      mockPrismaService.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '6.5.0',
        }),
      );

      await expect(
        service.updateProfile(userId, { name: 'Ada Lovelace' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw an error when the phone number is already taken (P2002)', async () => {
      mockPrismaService.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.5.0',
        }),
      );

      await expect(
        service.updateProfile(userId, { phoneNumber: '+380000000000' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw an error unchanged when Prisma fails for any other reason', async () => {
      const unknownError = new Error('connection lost');
      mockPrismaService.user.update.mockRejectedValue(unknownError);

      await expect(
        service.updateProfile(userId, { name: 'Ada Lovelace' }),
      ).rejects.toThrow(unknownError);
    });

    it('should successfully leave the location untouched when it is undefined', async () => {
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, { name: 'Ada Lovelace' });

      expect(mockPrismaService.location.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.location.create).not.toHaveBeenCalled();
      expect(firstUpdateCall().data.locationId).toBeUndefined();
    });

    it('should successfully clear the location when it is null', async () => {
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, { location: null });

      expect(mockPrismaService.location.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.location.create).not.toHaveBeenCalled();
      expect(firstUpdateCall().data.locationId).toBeNull();
    });

    it('should successfully reuse an existing location instead of creating one', async () => {
      mockPrismaService.location.findFirst.mockResolvedValue({
        id: locationId,
      });
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, {
        location: { country: 'Ukraine', city: 'Lviv' },
      });

      expect(mockPrismaService.location.findFirst).toHaveBeenCalledWith({
        where: { country: 'Ukraine', region: null, city: 'Lviv' },
        select: { id: true },
      });
      expect(mockPrismaService.location.create).not.toHaveBeenCalled();
      expect(firstUpdateCall().data.locationId).toBe(locationId);
    });

    it('should successfully create the location when no match exists', async () => {
      mockPrismaService.location.findFirst.mockResolvedValue(null);
      mockPrismaService.location.create.mockResolvedValue({ id: locationId });
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, {
        location: { country: 'Ukraine', region: 'Lviv oblast', city: 'Lviv' },
      });

      expect(mockPrismaService.location.create).toHaveBeenCalledWith({
        data: { country: 'Ukraine', region: 'Lviv oblast', city: 'Lviv' },
        select: { id: true },
      });
      expect(firstUpdateCall().data.locationId).toBe(locationId);
    });

    it('should successfully skip the profile upsert when only the name changes', async () => {
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, { name: 'Ada Lovelace' });

      // Інакше оновлення самого лише імені створювало б порожній рядок UserProfile.
      expect(firstUpdateCall().data.userProfile).toBeUndefined();
    });

    it('should successfully upsert the profile when profile fields are present', async () => {
      mockPrismaService.user.update.mockResolvedValue(profileRow);

      await service.updateProfile(userId, { bio: 'Counting things' });

      const profileData = {
        bio: 'Counting things',
        avatar: undefined,
        gender: undefined,
        birthDate: undefined,
        phoneNumber: undefined,
      };

      expect(firstUpdateCall().data.userProfile).toEqual({
        upsert: { create: profileData, update: profileData },
      });
    });
  });

  describe('updateSettings', () => {
    it('should successfully upsert the settings row', async () => {
      const settings = {
        id: '44444444-4444-4444-8444-444444444444',
        theme: 'dark',
        language: 'uk',
      };
      mockPrismaService.userSettings.upsert.mockResolvedValue(settings);

      const result = await service.updateSettings(userId, { theme: 'dark' });

      expect(result).toEqual(settings);
      expect(mockPrismaService.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, theme: 'dark' },
        update: { theme: 'dark' },
        select: { id: true, theme: true, language: true },
      });
    });
  });

  describe('deleteAccount', () => {
    it('should successfully soft-delete the user and revoke refresh tokens in one transaction', async () => {
      mockPrismaService.$transaction.mockResolvedValue([]);

      await service.deleteAccount(userId);

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: { id: userId, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserProfiles', () => {
    it('should successfully apply the service defaults for an empty query', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getUserProfiles({});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          name: undefined,
        },
        select: {
          id: true,
          name: true,
          userProfile: { select: { avatar: true } },
        },
        // id як унікальний tiebreaker — без нього сторінки «пливуть».
        orderBy: [{ name: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
        skip: 0,
        take: 20,
      });
    });

    it('should successfully search case-insensitively and honour paging', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getUserProfiles({
        search: 'ada',
        sort: UserSortField.CREATED_AT,
        sortDirection: Prisma.SortOrder.desc,
        skip: 40,
        limit: 5,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'ada', mode: Prisma.QueryMode.insensitive },
          }),
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 40,
          take: 5,
        }),
      );
    });

    it('should successfully map rows to the flat list shape', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: userId,
          name: 'Ada',
          userProfile: { avatar: 'https://cdn.dogood.org/ada.png' },
        },
        { id: locationId, name: 'Grace', userProfile: null },
      ]);

      const result = await service.getUserProfiles({});

      expect(result).toEqual([
        { id: userId, name: 'Ada', avatar: 'https://cdn.dogood.org/ada.png' },
        { id: locationId, name: 'Grace', avatar: null },
      ]);
    });
  });
});
