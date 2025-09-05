import { prisma } from '@/lib/prisma';
import {
  CachedTask,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/taskData.types';
import { getCache, setCache } from '@/utils/cache';
import logger from '@/utils/logger';

/**
 * Creates a new task in the database.
 * Determines host based on isOrganizationTask flag.
 * @param {CreateTaskInput} data - Task data including title, description, time, location, etc.
 * @returns {Promise<CachedTask>} The newly created task with categories included.
 */
export const createTaskService = async (
  data: CreateTaskInput
): Promise<CachedTask> => {
  const { categories, isOrganizationTask, hostId, organizationId, ...rest } =
    data;

  let host;
  if (isOrganizationTask) {
    host = await prisma.host.upsert({
      where: { organizationId },
      update: {},
      create: {
        type: 'ORGANIZATION',
        organizationId,
      },
    });
  } else {
    host = await prisma.host.upsert({
      where: { userId: hostId },
      update: {},
      create: {
        type: 'USER',
        userId: hostId,
      },
    });
  }

  const task = await prisma.task.create({
    data: {
      ...rest,
      hostId: host.id,
      categories: categories,
    },
    include: {
      host: {
        include: {
          user: true,
          organization: true,
        },
      },
      joinedUsers: true,
    },
  });

  await refreshAllTasksCache();

  logger.info(
    '✅ Task created successfully and all tasks cache was refreshed',
    {
      taskId: task.id,
      hostId: task.hostId,
      title: task.title,
    }
  );

  return task;
};

/**
 * Checks if a task with the same title, start time, host, and location already exists.
 * @param {CreateTaskInput} data - Task input to check for duplicates.
 * @returns {Promise<boolean>} True if a matching task exists, false otherwise.
 */
export const isTaskExists = async (data: CreateTaskInput): Promise<boolean> => {
  const { title, startTime, hostId, location } = data;

  if (!hostId) {
    logger.warn('❌ hostId is required to check for duplicate tasks');
    throw new Error('hostId is required to check for duplicate tasks');
  }

  const existing = await prisma.task.findFirst({
    where: {
      title,
      startTime: new Date(startTime),
      hostId,
      location, 
    },
  });

  logger.info('✅ Checked if task exists', {
    exists: Boolean(existing),
    title,
    startTime,
    hostId,
    location,
  });

  return Boolean(existing);
};

/**
 * Retrieves a single task by its ID with caching.
 * @param {number} taskId - ID of the task to retrieve.
 * @returns {Promise<CachedTask | null>} The task if found, otherwise null.
 */
export const getTaskByIdService = async (
  taskId: number
): Promise<CachedTask | null> => {
  const cacheKey = `task:${taskId}`;
  const cachedTask = await getCache<CachedTask>(cacheKey);

  if (cachedTask) {
    logger.info(`✅ Task ${taskId} fetched from cache`);
    return cachedTask;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      host: {
        include: {
          user: true,
          organization: true,
        },
      },
      joinedUsers: true,
    },
  });

  if (!task) {
    logger.warn(`❌ Task with id ${taskId} not found`);
    return null;
  }

  const taskForCache: CachedTask = {
    ...task,
    picture: task.picture ?? undefined,
    endDate: task.endDate ?? undefined,
    location: task.location ?? undefined,
  };

  await setCache<CachedTask>(cacheKey, taskForCache, 600);
  logger.info(`✅ Task ${taskId} fetched from DB and cached`);

  return taskForCache;
};

/**
 * Fetches all tasks from the database, including host, joined users, and organization, with caching.
 * @returns {Promise<CachedTask[]>} An array of tasks.
 */
export const getAllTasksService = async (): Promise<CachedTask[]> => {
  const cacheKey = 'allTasks';
  const cachedTasks = await getCache<CachedTask[]>(cacheKey);

  if (cachedTasks) {
    logger.info('✅ All tasks fetched from cache');
    return cachedTasks;
  }

  const tasks = await prisma.task.findMany({
    include: {
      host: {
        include: {
          user: true,
          organization: true,
        },
      },
      joinedUsers: true,
    },
  });

  await setCache<CachedTask[]>(cacheKey, tasks, 600);
  logger.info('✅ All tasks fetched from DB and cached');

  return tasks;
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
 * Categories and other editable fields can be updated.
 * Host and status cannot be changed here.
 * @param {UpdateTaskInput} data - Updated task data.
 * @returns {Promise<CachedTask>} The updated task.
 */
export const updateTaskService = async (data: UpdateTaskInput) => {
  const { id, categories, ...rest } = data;

  if (!categories || categories.length === 0) {
    logger.warn('❌ Attempted to update task without categories', { id });
    throw new Error('Task must have at least one category');
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(categories && { categories }),
    },
    include: {
      host: {
        include: {
          user: true,
          organization: true,
        },
      },
      joinedUsers: true,
    },
  });

  await refreshAllTasksCache();

  logger.info(
    '✅ Task updated successfully and all tasks cache was refreshed',
    { id }
  );
  return updatedTask;
};

/**
 * Refreshes the cache for all tasks by fetching them from the database.
 * @returns {Promise<void>}
 */
export const refreshAllTasksCache = async (): Promise<void> => {
  const tasks = await prisma.task.findMany({
    include: {
      host: {
        include: {
          user: true,
          organization: true,
        },
      },
      joinedUsers: true,
    },
  });

  await setCache<CachedTask[]>('allTasks', tasks, 600);
};
