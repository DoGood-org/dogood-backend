import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HashService } from '@shared/services/hash.service';
import { UserService } from 'src/user/services/user.service';

describe('UserService', () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
  };
  const hashService = { verifyPassword: jest.fn(), hashPassword: jest.fn() };
  const service = new UserService(
    prisma as unknown as PrismaService,
    hashService as unknown as HashService,
  );
  const existingUser = { email: 'old@example.com', password: 'stored-hash' };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('update', () => {
    it('should reject a wrong current password with 403 and write nothing', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      hashService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.update('user-1', {
          password: 'NewPassw0rd',
          currentPassword: 'wrong',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(hashService.verifyPassword).toHaveBeenCalledWith(
        'wrong',
        'stored-hash',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should not ask for the current password without a new password', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null);

      await service.update('user-1', {
        name: 'Mark',
        email: 'new@example.com',
      });

      expect(hashService.verifyPassword).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Mark', email: 'new@example.com', password: undefined },
        }),
      );
    });

    it('should hash a new password', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      hashService.verifyPassword.mockResolvedValue(true);
      hashService.hashPassword.mockResolvedValue('new-hash');

      await service.update('user-1', {
        password: 'NewPassw0rd',
        currentPassword: 'OldPassw0rd',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'new-hash' }),
        }),
      );
    });
  });
});
