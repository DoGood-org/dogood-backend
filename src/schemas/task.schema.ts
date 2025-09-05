import { z } from 'zod';

const CategoryTypeEnum = z.enum([
  'NATURE',
  'ANIMAL',
  'FOOD',
  'MEDICINE',
  'DONATION',
]);

const TaskStatusEnum = z.enum([
  'PENDING',
  'CREATED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CLOSED',
]);

const createTaskSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  picture: z.string().url().optional(),
  hostId: z.number().int().positive().optional(),
  startDate: z
    .string()
    .datetime({ message: 'startDate must be a valid ISO date' }),
  startTime: z
    .string()
    .datetime({ message: 'startTime must be a valid ISO date' }),
  endDate: z
    .string()
    .datetime({ message: 'endDate must be a valid ISO date' })
    .optional(),
  latitude: z
    .number()
    .min(-90, { message: 'Latitude must be >= -90' })
    .max(90, { message: 'Latitude must be <= 90' }),
  longitude: z
    .number()
    .min(-180, { message: 'Longitude must be >= -180' })
    .max(180, { message: 'Longitude must be <= 180' }),
  locationName: z.string().optional(),
  status: TaskStatusEnum.optional(),
  categories: z
    .array(CategoryTypeEnum)
    .min(1, { message: 'At least one category is required' }),
  organizationId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  picture: z.string().url().optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  latitude: z
    .number()
    .min(-90, { message: 'Latitude must be >= -90' })
    .max(90, { message: 'Latitude must be <= 90' })
    .optional(),
  longitude: z
    .number()
    .min(-180, { message: 'Longitude must be >= -180' })
    .max(180, { message: 'Longitude must be <= 180' })
    .optional(),
  locationName: z.string().optional(),
  categories: z.array(CategoryTypeEnum).optional(),
  organizationId: z.string().uuid().optional(),
});

const updateTaskStatusSchema = z.object({
  id: z.number().int().positive(),
  status: TaskStatusEnum,
});

const deleteTaskSchema = z.object({
  id: z.number().int().positive(),
});

export const schemas = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  deleteTaskSchema,
};
