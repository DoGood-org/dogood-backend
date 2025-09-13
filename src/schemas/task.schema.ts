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
  isOrganization: z.boolean({
    required_error: 'isOrganization is required',
  }),
  organizationId: z
    .string()
    .uuid({ message: 'organizationId must be a valid UUID' })
    .optional(),
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
  location: z
    .object({
      lat: z.number({ required_error: 'Latitude is required' }),
      lng: z.number({ required_error: 'Longitude is required' }),
    })
    .optional(),

  locationName: z.string().optional(),
  categories: z
    .array(CategoryTypeEnum)
    .min(1, { message: 'At least one category is required' }),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  picture: z.string().url().optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  location: z
    .object({
      lat: z.number({ required_error: 'Latitude is required' }),
      lng: z.number({ required_error: 'Longitude is required' }),
    })
    .optional(),

  locationName: z.string().optional(),
  categories: z.array(CategoryTypeEnum).optional(),
});

const updateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
});

const searchTasksSchema = z.object({
  title: z.string().optional(),
  categories: z.array(CategoryTypeEnum).optional(),
  locationName: z.string().optional(),
  location: z
    .object({
      lat: z.number({ required_error: 'Latitude is required' }),
      lng: z.number({ required_error: 'Longitude is required' }),
    })
    .optional(),
  radiusKm: z.number().min(0).optional(),
});

export const schemas = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  searchTasksSchema,
};
