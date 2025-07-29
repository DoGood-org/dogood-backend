import { prisma } from '@/lib/prisma';
import { CreateTaskInput, UpdateTaskInput } from '@/types/taskData.types';
import { getCache, setCache } from '@/utils/cache';
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

  await refreshAllTasksCache();

  logger.info(
    '✅ Task created successfully and all tasks cache was refreshed ',
    {
      taskId: task.id,
      hostId: task.hostId,
      title: task.title,
    }
  );

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

  logger.info('✅ Checked if task exists', {
    exists: Boolean(existing),
  });

  return Boolean(existing);
};

/**
 * Retrieves a single task by its ID.
 * @param {number} taskId - ID of the task to retrieve.
 * @returns {Promise<any|null>} The task if found, otherwise null.
 */
export const getTaskByIdService = async (taskId: number) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  logger.info(`✅ Fetched task with id ${taskId}`, { taskId });

  return task;
};

/**
 * Fetches all tasks from the database, including categories, host, and joined users.
 * @returns {Promise<any[]>} An array of tasks.
 */
export const getAllTasksService = async () => {
  const cachedTasks = await getCache('allTasks');

  if (cachedTasks) {
    logger.info('✅ Fetched all events from cache');
    return cachedTasks;
  }

  const task = await prisma.task.findMany({
    include: {
      categories: true,
      host: true,
      joinedUsers: true,
    },
  });

  await setCache('allTasks', task, 600);
  logger.info('✅ All tasks fetched from database and cached');

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

  await refreshAllTasksCache();

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

  await refreshAllTasksCache();

  return updatedTask;
};

/**
 * Refreshes the cache for all tasks by fetching them from the database.
 * @returns {Promise<void>}
 * */
const refreshAllTasksCache = async () => {
  const tasks = await prisma.task.findMany({
    include: {
      categories: true,
      host: true,
      joinedUsers: true,
    },
  });
  await setCache('allTasks', tasks, 600);
};
