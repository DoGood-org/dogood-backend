import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { UserDataMapperV1 } from 'src/user/data-mappers/v1/user.data-mapper';
import { userSearchSelectV1 } from 'src/user/interfaces/v1/user';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

describe('UserServiceV1', () => {
  let service: UserServiceV1;

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
      create: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUserDataMapper = {
    toUserProfile: jest.fn(),
    toPublicUserProfile: jest.fn(),
    toUserSearchResults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceV1,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserDataMapperV1, useValue: mockUserDataMapper },
      ],
    }).compile();

    service = module.get<UserServiceV1>(UserServiceV1);
    jest.resetAllMocks();
  });

  it('should read a profile filtering out soft-deleted users', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.getUserProfileById('user-id');

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-id', deletedAt: null } }),
    );
  });

  it('should answer the legacy 404 payload when the profile is missing', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(service.getUserProfileById('missing')).rejects.toMatchObject({
      response: {
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.USER_NOT_FOUND,
        message: 'User not found',
      },
    });
  });

  it('should answer the legacy 404 payload for a missing public profile', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.getPublicUserProfileById('missing'),
    ).rejects.toBeInstanceOf(V1ApiException);
  });

  it('should upsert the profile and re-read the user after an update', async () => {
    mockPrismaService.user.update.mockResolvedValue({});
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { name: 'New', bio: 'bio' });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        name: 'New',
        stripeCustomerId: undefined,
        userProfile: {
          upsert: { create: { bio: 'bio' }, update: { bio: 'bio' } },
        },
        location: undefined,
      },
    });
    expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
  });

  // NOTE: the legacy nested upsert is reproduced verbatim, shared Location row included
  // (ADR-0006). This test is what fails if someone "fixes" it into a connect.
  it('should upsert the location in place, as the legacy statement did', async () => {
    const location = { country: 'Ukraine', region: 'Kyiv', city: 'Kyiv' };

    mockPrismaService.user.update.mockResolvedValue({});
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location });

    expect(mockPrismaService.location.findFirst).not.toHaveBeenCalled();
    expect(mockPrismaService.location.create).not.toHaveBeenCalled();
    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          location: { upsert: { create: location, update: location } },
        }),
      }),
    );
  });

  it('should leave the location untouched when the body sends null', async () => {
    mockPrismaService.user.update.mockResolvedValue({});
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockUserDataMapper.toUserProfile.mockReturnValue({ id: 'user-id' });

    await service.updateMyProfile('user-id', { location: null });

    expect(mockPrismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: undefined }),
      }),
    );
  });

  it('should soft delete the user and revoke refresh tokens in one transaction', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
    mockPrismaService.$transaction.mockResolvedValue([]);

    await service.deleteMyProfile('user-id');

    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
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

  it('should upsert the settings and answer with the stored values', async () => {
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

  it('should create the settings row when the user has none, changing nothing on an empty body', async () => {
    mockPrismaService.userSettings.upsert.mockResolvedValue({
      theme: 'dark',
      language: 'en',
    });

    await service.updateMySettings('user-id', {});

    expect(mockPrismaService.userSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {}, create: { userId: 'user-id' } }),
    );
  });

  // NOTE: the legacy controller ran this check before touching the database
  // (develop:src/controllers/userProfile.controller.ts:143) and passed the code explicitly,
  // which is why this 400 carries VALIDATION_ERROR while a schema failure carries null.
  it('should reject a missing name with the legacy VALIDATION_ERROR payload', async () => {
    await expect(service.searchUsersByName()).rejects.toMatchObject({
      response: {
        status: 'error',
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Name query is required',
      },
    });
    expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
  });

  it('should search case-insensitively by substring and cap the result at ten', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);
    mockUserDataMapper.toUserSearchResults.mockReturnValue([]);

    await service.searchUsersByName('Iv');

    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        name: { contains: 'Iv', mode: Prisma.QueryMode.insensitive },
      },
      select: userSearchSelectV1,
      take: 10,
    });
  });
});
