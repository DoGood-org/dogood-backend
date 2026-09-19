import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupCronService } from './token-cleanup.cron';
import { PrismaService } from '@database/prisma.service';

describe('TokenCleanupCronService', () => {
  let service: TokenCleanupCronService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    refreshToken: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupCronService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TokenCleanupCronService>(TokenCleanupCronService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCleanupExpiredRefreshTokens', () => {
    it('should delete expired or revoked refresh tokens with OR condition', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const deletedCount = await service.handleCleanupExpiredRefreshTokens();

      expect(deletedCount).toBe(5);
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { revokedAt: { not: null } },
          ],
        },
      });
    });

    it('should handle errors gracefully and return 0', async () => {
      mockPrismaService.refreshToken.deleteMany.mockRejectedValue(
        new Error('DB Error'),
      );

      const deletedCount = await service.handleCleanupExpiredRefreshTokens();

      expect(deletedCount).toBe(0);
    });
  });
});
