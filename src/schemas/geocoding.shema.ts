import { z } from 'zod';

export const reverseGeocodeResponseSchema = z.object({
  display_name: z.string().optional(),
  address: z.object({
    country: z.string().optional(),
    state: z.string().optional(),
    region: z.string().optional(),
    county: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
  }).optional(),
});
