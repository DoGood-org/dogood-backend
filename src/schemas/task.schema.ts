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
  hostId: z
    .number()
    .int()
    .positive({ message: 'Host ID must be a positive integer' }),
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
  location: z.string().optional(), // Очікуємо формат "POINT(lng lat)"
  locationName: z.string().optional(),
  categories: z
    .array(CategoryTypeEnum)
    .min(1, { message: 'At least one category is required' }),
});

const updateTaskSchema = z.object({
  id: z
    .number()
    .int()
    .positive({ message: 'Task ID must be a positive integer' }),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  picture: z.string().url().optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  startTime: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  location: z.string().optional(), // Очікуємо формат "POINT(lng lat)"
  locationName: z.string().optional(),
  categories: z.array(CategoryTypeEnum).optional(),
});

const updateTaskStatusSchema = z.object({
  id: z.number().int().positive(),
  status: TaskStatusEnum,
});

const deleteTaskSchema = z.object({
  id: z.number().int().positive(),
});

const searchTasksSchema = z.object({
  title: z.string().optional(),
  categories: z
    .array(CategoryTypeEnum)
    .min(1, { message: 'At least one category is required' }),
  location: z.string().optional(), // очікуємо формат "POINT(lng lat)"
  radiusKm: z.number().min(0).optional(),
});

export const schemas = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  deleteTaskSchema,
  searchTasksSchema,
};
