import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { HashService } from '@shared/services/hash.service';
import { UserV1Service } from 'src/user/services/v1/user-v1.service';
import { UpdateUserRequestV1Dto } from 'src/user/dto/v1/requests';

/**
 * v1 — заморожений legacy-контракт. Тести фіксують поточну поведінку як є,
 * включно з її вадами (див. `role` в `update`), щоб рефакторинг її не змінив.
 */
describe('UserV1Service', () => {
  let service: UserV1Service;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockHashService = {
    hashPassword: jest.fn(),
  };

  const userId = '11111111-1111-4111-8111-111111111111';

  const userProfile = {
    id: userId,
    email: 'ada@dogood.org',
    name: 'Ada',
    role: SiteRole.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserV1Service,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HashService, useValue: mockHashService },
      ],
    }).compile();

    service = module.get<UserV1Service>(UserV1Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should throw an error when the user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });

    it('should successfully return the user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(userProfile);

      const result = await service.findById(userId);

      expect(result).toEqual(userProfile);
      // v1 навмисно не фільтрує deletedAt — частина замороженого контракту.
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userId } }),
      );
    });
  });

  describe('update', () => {
    it('should throw an error when the user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(userId, { name: 'Ada Lovelace' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw an error when the new email is already in use', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: userId, email: 'ada@dogood.org' })
        .mockResolvedValueOnce({ id: '22222222-2222-4222-8222-222222222222' });

      await expect(
        service.update(userId, { email: 'taken@dogood.org' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should successfully update the name without touching the password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'ada@dogood.org',
      });
      mockPrismaService.user.update.mockResolvedValue(userProfile);

      const result = await service.update(userId, { name: 'Ada Lovelace' });

      expect(result).toEqual(userProfile);
      expect(mockHashService.hashPassword).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { name: 'Ada Lovelace' },
        }),
      );
    });

    it('should successfully hash the password before writing it', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'ada@dogood.org',
      });
      mockHashService.hashPassword.mockResolvedValue('hashed-secret');
      mockPrismaService.user.update.mockResolvedValue(userProfile);

      await service.update(userId, { password: 'plain-secret' });

      expect(mockHashService.hashPassword).toHaveBeenCalledWith('plain-secret');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { password: 'hashed-secret' } }),
      );
    });

    it('should successfully skip the uniqueness check when the email is unchanged', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'ada@dogood.org',
      });
      mockPrismaService.user.update.mockResolvedValue(userProfile);

      await service.update(userId, { email: 'ada@dogood.org' });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { email: 'ada@dogood.org' } }),
      );
    });

    it('should successfully write the role supplied in the body', async () => {
      // ЗАФІКСОВАНА ВАДА: v1 приймає `role` від самого користувача, тобто
      // будь-хто може підняти себе до ADMIN. Живе під заморозкою v1,
      // у v2 поля `role` в схемі оновлення немає. Виправляти окремою гілкою.
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'ada@dogood.org',
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...userProfile,
        role: SiteRole.ADMIN,
      });

      const dto: UpdateUserRequestV1Dto = { role: SiteRole.ADMIN };

      await service.update(userId, dto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: SiteRole.ADMIN } }),
      );
    });
  });
});
