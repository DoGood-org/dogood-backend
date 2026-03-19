import { prisma } from "@/lib/prisma";
import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';

/**
 * Liveness probe. 
 * Checks if the application process is running.
 */
const liveness = async (_req: Request, res: Response) => {
  res.status(200).send('OK');
};

/**
 * Readiness probe.
 * Checks if the application is ready to handle traffic.
 */
const readiness = async (_req: Request, res: Response) => {
  // Виконуємо запит до БД. Якщо впаде — asyncHandler передасть помилку далі.
  await prisma.$queryRaw`SELECT 1`;

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    services: { database: 'up' }
  });
};

export const healthControllers = {
  liveness: asyncHandler(liveness),
  readiness: asyncHandler(readiness)
};