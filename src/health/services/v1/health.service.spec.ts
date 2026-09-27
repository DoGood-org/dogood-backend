import {
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HealthServiceV1 } from 'src/health/services/v1/health.service';

describe('HealthServiceV1', () => {
  const prisma = { $queryRaw: jest.fn() };
  const service = new HealthServiceV1(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should ping the database and return the legacy readiness body', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.getHealthReadiness();
    const { status, timestamp, services } = result;

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(status).toBe('ready');
    expect(services).toEqual({ database: 'up' });
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('should answer 503 with code null and a fixed message when the database is down', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    prisma.$queryRaw.mockRejectedValue(
      new Error("Can't reach database server at `db:5432`"),
    );

    const readiness = service.getHealthReadiness();

    await expect(readiness).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(readiness).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: {
        status: 'error',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: null,
        message: 'Database unavailable',
      },
    });
    expect(loggerError).toHaveBeenCalled();
  });
});
