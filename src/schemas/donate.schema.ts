import { z } from 'zod';

const createDonateSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 letters').toLowerCase(),
  donationType: z.enum(['USER', 'ORGANIZATION']),
  userId: z.string().optional(),
  organizationId: z.number().int().positive().optional(),
  message: z.string().max(500).optional(),
  name: z.string().max(100).optional(),
});

export const schemas = { createDonateSchema };
