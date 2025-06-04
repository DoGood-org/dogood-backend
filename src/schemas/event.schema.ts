import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  hostId: z
    .number({ invalid_type_error: 'hostId must be a number' })
    .int()
    .positive({ message: 'hostId must be a positive integer' }),
  categories: z
    .array(
      z
        .number({ invalid_type_error: 'Each category must be a number' })
        .int()
        .positive()
    )
    .min(1, { message: 'At least one category is required' }),
  startTime: z
    .string()
    .datetime({ message: 'startTime must be a valid ISO date' }),
  endTime: z.string().datetime({ message: 'endTime must be a valid ISO date' }),
  latitude: z
    .number()
    .min(-90, { message: 'Latitude must be >= -90' })
    .max(90, { message: 'Latitude must be <= 90' }),
  longitude: z
    .number()
    .min(-180, { message: 'Longitude must be >= -180' })
    .max(180, { message: 'Longitude must be <= 180' }),
});

export const schemas = { createEventSchema };
