import { prisma } from '@/lib/prisma';
import { CreateTaskInput, UpdateTaskInput } from '@/types/taskData.types';
import logger from '@/utils/logger';



/**
 * Creates a new task in the database.
 * @param {CreateTaskInput} data - Task data including title, description, time, coordinates, etc.
 * @returns {Promise<any>} The newly created task with categories included.
 */
export const createTaskService = async (data: CreateTaskInput) => {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      hostId: data.hostId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      latitude: data.latitude,
      longitude: data.longitude,
      categories: {
        connect: data.categories.map((categoryId) => ({ id: categoryId })),
      },
    },
    include: {
      categories: true,
    },
  });

  return task;
};

/**
 * Checks if a task with the same title, time, and location already exists for a given host.
 * @param {CreateTaskInput} data - Task input to check for duplicates.
 * @returns {Promise<boolean>} True if a matching task exists, false otherwise.
 */
export const isTaskExists = async (data: CreateTaskInput) => {
  const existing = await prisma.task.findFirst({
    where: {
      title: data.title,
      startTime: new Date(data.startTime),
      hostId: data.hostId,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  return Boolean(existing);
};

/**
 * Retrieves a single task by its ID.
 * @param {number} taskId - ID of the task to retrieve.
 * @returns {Promise<any|null>} The task if found, otherwise null.
 */
export const getTaskByIdService = async (taskId: number) => {
  return prisma.task.findUnique({
    where: { id: taskId },
  });
};

/**
 * Fetches all tasks from the database, including categories, host, and joined users.
 * @returns {Promise<any[]>} An array of tasks.
 */
export const getAllTasksService = async () => {
  const task = await prisma.task.findMany({
    include: {
      categories: true,
      host: true,
      joinedUsers: true,
    },
  });
  return task;
};

/**
 * Deletes a task by its ID.
 * @param {number} taskId - ID of the task to delete.
 * @returns {Promise<any>} The deleted task.
 */
export const deleteTaskService = async (taskId: number) => {
  const deletedEvent = await prisma.task.delete({
    where: { id: taskId },
  });

  logger.info('✅ Task deleted successfully', { taskId });

  return deletedEvent;
};

/**
 * Updates an existing task by ID.
 * Optionally updates categories by clearing and reconnecting.
 * @param {UpdateTaskInput} data - Updated task data.
 * @returns {Promise<any>} The updated task.
 */
export const updateTaskService = async (data: UpdateTaskInput) => {
  const { id, categories, ...rest } = data;

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(categories && {
        categories: {
          set: [], // Clear existing categories
          connect: categories.map((id) => ({ id })),
        },
      }),
    },
    include: {
      categories: true,
    },
  });

  return updatedTask;
};
