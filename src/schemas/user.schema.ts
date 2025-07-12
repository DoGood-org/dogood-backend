import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  avatar: z.string().optional(),
  settings: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      language: z.string().max(10).optional(),
    })
    .optional(),
});
