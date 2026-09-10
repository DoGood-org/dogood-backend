import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { UserDataMapperV2 } from 'src/user/data-mappers/v2/user.data-mapper';
import { UserSortField } from 'src/user/interfaces/v2/user';
import { UserServiceV2 } from 'src/user/services/v2/user.service';

describe('UserServiceV2', () => {
  let service: UserServiceV2;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    userSettings: {
      upsert: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUserDataMapper = {
    toUserProfile: jest.fn(),
    toPublicUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceV2,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserDataMapperV2, useValue: mockUserDataMapper },
      ],
    }).compile();

    service = module.get<UserServiceV2>(UserServiceV2);
    jest.resetAllMocks();
  });

  it('should throw a standard NotFoundException for a missing own profile', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.getMyProfile('user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should only expose active, non-deleted users on the public profile', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toPublicUserProfile.mockReturnValue({ id: 'user-id' });

    await service.getUserProfileById('user-id');

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user-id',
          deletedAt: null,
          status: UserStatus.ACTIVE,
        },
      }),
    );
  });

  it('should update and return the profile in a single round trip', async () => {
    mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { name: 'New', bio: 'bio' });

    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id', deletedAt: null },
      data: {
        name: 'New',
        location: undefined,
        userProfile: {
          upsert: { create: { bio: 'bio' }, update: { bio: 'bio' } },
        },
      },
      select: expect.any(Object) as Prisma.UserSelect,
    });
  });

  it('should disconnect the location when the body sends null', async () => {
    mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location: null });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: { disconnect: true } }),
      }),
    );
  });

  it('should treat a location without a single filled field as null', async () => {
    mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location: {} });
    await service.updateMyProfile('user-id', {
      location: { country: null, region: null, city: null },
    });

    expect(mockPrismaService.location.findFirst).not.toHaveBeenCalled();
    expect(mockPrismaService.user.update).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: { disconnect: true } }),
      }),
    );
  });

  it('should connect a matching location row rather than create a duplicate', async () => {
    mockPrismaService.location.findFirst.mockResolvedValue({ id: 'loc-id' });
    mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location: { city: 'Kyiv' } });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          location: { connect: { id: 'loc-id' } },
        }),
      }),
    );
  });

  it('should create the location inline when nothing matches', async () => {
    mockPrismaService.location.findFirst.mockResolvedValue(null);
    mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location: { city: 'Lviv' } });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          location: { create: { country: null, region: null, city: 'Lviv' } },
        }),
      }),
    );
  });

  it('should translate a P2025 miss into a NotFoundException', async () => {
    mockPrismaService.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateMyProfile('user-id', { name: 'New' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should translate a P2002 clash into a ConflictException', async () => {
    mockPrismaService.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.updateMyProfile('user-id', { phoneNumber: '+380000000000' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should rethrow prisma errors it does not translate', async () => {
    const failure = new Prisma.PrismaClientKnownRequestError('Constraint', {
      code: 'P2003',
      clientVersion: 'test',
    });

    mockPrismaService.user.update.mockRejectedValue(failure);

    await expect(
      service.updateMyProfile('user-id', { name: 'New' }),
    ).rejects.toBe(failure);
  });

  it('should soft delete the user and revoke refresh tokens in one transaction', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockPrismaService.$transaction.mockResolvedValue([]);

    await service.deleteMyProfile('user-id');

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id', deletedAt: null },
      data: { deletedAt: expect.any(Date) as Date },
    });
    expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });

  it('should skip the delete when the user is already gone', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await service.deleteMyProfile('missing');

    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should apply the service defaults when the query carries none', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);

    await service.getUserProfiles({});

    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, name: undefined },
        orderBy: [{ name: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
        skip: 0,
        take: 20,
      }),
    );
  });

  // NOTE: `name` and `createdAt` are not unique, so without the `id` tiebreaker rows
  // duplicate or vanish between pages.
  it('should always add the id tiebreaker after the requested sort', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);

    await service.getUserProfiles({
      sort: UserSortField.CREATED_AT,
      sortDirection: Prisma.SortOrder.desc,
      skip: 40,
      limit: 2,
    });

    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { createdAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.asc },
        ],
        skip: 40,
        take: 2,
      }),
    );
  });

  it('should search case-insensitively and hide soft-deleted users', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);

    await service.getUserProfiles({ search: 'iv' });

    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          name: { contains: 'iv', mode: Prisma.QueryMode.insensitive },
        },
      }),
    );
  });

  it('should map every listed row through the public profile mapper', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);
    mockUserDataMapper.toPublicUserProfile.mockImplementation(
      (row: { id: string }) => row,
    );

    await expect(service.getUserProfiles({})).resolves.toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('should upsert the settings and answer with them flat', async () => {
    const settings = { theme: 'dark', language: 'uk' };

    mockPrismaService.userSettings.upsert.mockResolvedValue(settings);

    await expect(
      service.updateMySettings('user-id', { language: 'uk' }),
    ).resolves.toEqual(settings);
    expect(mockPrismaService.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      update: { language: 'uk' },
      create: { userId: 'user-id', language: 'uk' },
      select: { theme: true, language: true },
    });
  });
});
