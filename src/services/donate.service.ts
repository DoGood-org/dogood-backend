import { httpError } from '@/helpers/httpError';
import { prisma } from '@/lib/prisma';
import { CreateDonation } from '@/types/donate.types';
import logger from '@/utils/logger';
import { Request } from 'express';

export async function createDonation(data: CreateDonation) {
  const exists = await prisma.donate.findUnique({
    where: { transactionId: data.transactionId },
  });

  if (exists) {
    logger.warn('⚠️ Donation with this transactionId already exists', {
      transactionId: data.transactionId,
    });
    return exists;
  }

  const donation = await prisma.donate.create({ data });
  logger.info('✅ Donation saved', { transactionId: data.transactionId });
  return donation;
}

export async function findDonation(req: Request) {
  const donation = await prisma.donate.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!donation) {
    logger.warn('Donation does not exist', { donation });
    return httpError(404, 'Donation not found');
  }

  logger.info('✅ Donation is found', { donation });
  return donation;
}
