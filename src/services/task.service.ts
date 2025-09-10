import { httpError } from '@/helpers/httpError';
import { prisma } from '@/lib/prisma';
import {
  CachedTask,
  CreateTaskInput,
  HostData,
  SearchTasksInput,
  UpdateTaskInput,
} from '@/types/taskData.types';
import { buildTasksBaseQuery } from '@/utils/buildTaskQuery';
import { getCache, setCache } from '@/utils/cache';
import { parseLocation } from '@/utils/locationParses';
import logger from '@/utils/logger';
import { Prisma, TaskStatus } from '@prisma/client';

/**
 * Creates a task with proper PostGIS location handling.
 * @param {CreateTaskInput} data - Task data from request.
 * @param {number} userId - ID of the user creating the task.
 * @returns {Promise<CachedTask>} The created task including host and joined users.
 */
export const createTaskService = async (
  data: CreateTaskInput,
  userId: number
): Promise<CachedTask> => {
  const { categories, isOrganization, organizationId, location, ...rest } =
    data;

  const host = await createHostService(isOrganization, organizationId, userId);

  const categoriesArray = `{${categories.join(',')}}`;

  const insertSQL = `
    INSERT INTO "Task"
      (title, description, picture, "hostId", "startDate", "startTime", "endDate", location, "locationName", categories, "createdAt", "updatedAt")
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), $9, $10::"CategoryType"[], NOW(), NOW())
    RETURNING
      id,
      title,
      description,
      picture,
      "hostId",
      "startDate",
      "startTime",
      "endDate",
      ST_AsText(location) AS location,
      "locationName",
      status,
      categories,
      "createdAt",
      "updatedAt";
  `;

  const values = [
    rest.title,
    rest.description,
    rest.picture ?? null,
    host.id,
    new Date(rest.startDate),
    new Date(rest.startTime),
    rest.endDate ? new Date(rest.endDate) : null,
    location ? `POINT(${location.lng} ${location.lat})` : null,
    rest.locationName ?? null,
    categoriesArray,
  ];

  let createdTask: CachedTask;
  try {
    [createdTask] = await prisma.$queryRawUnsafe<CachedTask[]>(
      insertSQL,
      ...values
    );
  } catch (err) {
    logger.error('❌ Error creating task', { error: err });
    throw httpError(500, 'Failed to create task');
  }

  if (!createdTask) {
    throw httpError(500, 'Task creation returned no result');
  }

  const taskWithRelations = await getTaskByIdService(createdTask.id);

  if (!taskWithRelations) {
    throw httpError(500, 'Failed to fetch created task with relations');
  }

  await refreshAllTasksCache();

  logger.info(
    '✅ Task created successfully and all tasks cache was refreshed',
    {
      taskId: taskWithRelations.id,
      hostId: host.id,
      title: taskWithRelations.title,
    }
  );

  return taskWithRelations;
};

/**
 * Checks if a task with the same title, start time, host, and location already exists.
 * @param {CreateTaskInput} data - Task input to check for duplicates.
 * @returns {Promise<boolean>} True if a matching task exists, false otherwise.
 */
export const isTaskExists = async (data: CreateTaskInput): Promise<boolean> => {
  const { title, startTime } = data;

  const existing = await prisma.task.findFirst({
    where: {
      title,
      startTime: new Date(startTime),
    },
  });

  logger.info('✅ Checked if task exists', {
    exists: Boolean(existing),
    title,
    startTime,
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

  const task = (await prisma.task.findUnique({
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
  })) as any;

  if (!task) {
    logger.warn(`❌ Task with id ${taskId} not found`);
    return null;
  }

  const taskForCache: CachedTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    picture: task.picture ?? undefined,
    startDate: task.startDate,
    startTime: task.startTime,
    endDate: task.endDate ?? undefined,
    location: task.location ?? undefined,
    locationName: task.locationName ?? undefined,
    status: task.status,
    categories: task.categories,
    host: {
      type: task.host.type,
      user: task.host.user
        ? {
            id: task.host.user.id,
            name: task.host.user.name,
            email: task.host.user.email,
            createdAt: task.host.user.createdAt,
            updatedAt: task.host.user.updatedAt,
          }
        : undefined,
      organization: task.host.organization
        ? {
            id: task.host.organization.id,
            name: task.host.organization.name,
            createdAt: task.host.organization.createdAt,
          }
        : undefined,
    },
    joinedUsers: task.joinedUsers.map((u: { id: number; name: string }) => ({
      id: u.id,
      name: u.name,
    })),
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

  const sql = Prisma.sql([buildTasksBaseQuery()]);
  const tasks: CachedTask[] = await prisma.$queryRaw<CachedTask[]>(sql);

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

  if (!deletedEvent) {
    logger.error(`❌ Task ${taskId} not found for deletion`);
    throw httpError(404, `Task with id ${taskId} not found`);
  }

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
export const updateTaskService = async (
  data: UpdateTaskInput,
  taskId: number
): Promise<CachedTask> => {
  const existingTask = getTaskByIdService(taskId);
  if (!existingTask) {
    logger.warn('❌ Attempted to update a task that does not exist', {
      taskId,
    });
    throw httpError(404, `Task with id ${taskId} not found`);
  }

  const prismaData: any = { ...data };
  if (data.location) {
    prismaData.location = `POINT(${data.location.lng} ${data.location.lat})`;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: prismaData,
  });

  await refreshAllTasksCache();

  const updatedTaskRaw = await getTaskByIdService(taskId);

  if (!updatedTaskRaw) {
    logger.error(`❌ Task ${taskId} not found after update`);
    throw httpError(500, 'Failed to fetch updated task');
  }

  logger.info(
    '✅ Task updated successfully and all tasks cache was refreshed',
    { taskId }
  );

  return updatedTaskRaw;
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

  const tasksWithParsedLocation: CachedTask[] = tasks.map((task) => ({
    ...task,
    location: parseLocation((task as any).location),
  }));

  await setCache<CachedTask[]>('allTasks', tasksWithParsedLocation, 600);
};

/**
 * Searches tasks with optional filters: title, categories, location + radius.
 * Returns tasks along with full host info (user or organization).
 * @param {SearchTasksInput} params - Search parameters.
 * @returns {Promise<CachedTask[]>} Array of tasks with host details.
 */
export const searchTasks = async (
  params: SearchTasksInput
): Promise<CachedTask[]> => {
  const { title, categories, location, radiusKm, locationName } = params;

  const values: any[] = [];
  const whereClauses: string[] = [];

  if (title) {
    values.push(title);
    whereClauses.push(`t.title ILIKE '%' || $${values.length} || '%'`);
  }

  if (categories && categories.length > 0) {
    values.push(categories);
    whereClauses.push(
      `t.categories && ARRAY[$${values.length}]::"CategoryType"[]`
    );
  }

  if (location && radiusKm) {
    const locationWKT = `POINT(${location.lng} ${location.lat})`;
    values.push(locationWKT);
    values.push(radiusKm);
    whereClauses.push(
      `ST_DWithin(t.location::geography, ST_GeogFromText($${values.length - 1}), $${values.length} * 1000)`
    );
  }

  if (locationName) {
    values.push(locationName);
    whereClauses.push(`t."locationName" ILIKE '%' || $${values.length} || '%'`);
  }

  const whereSQL =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.picture,
    t."startDate",
    t."startTime",
    t."endDate",
    json_build_object(
      'lng', ST_X(t.location::geometry),
      'lat', ST_Y(t.location::geometry)
    ) AS location,
    t."locationName",
    t.status,
    t.categories,
    json_build_object(
      'type', h.type,
      'user', json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email
      ),
      'organization', json_build_object(
        'id', o.id,
        'name', o.name
      )
    ) AS host
  FROM "Task" t
  LEFT JOIN "Host" h ON t."hostId" = h.id
  LEFT JOIN "User" u ON h."userId" = u.id
  LEFT JOIN "Organization" o ON h."organizationId" = o.id
  ${whereSQL}
`;

  const tasks: CachedTask[] = await prisma.$queryRawUnsafe<CachedTask[]>(
    sql,
    ...values
  );

  logger.info('✅ searchTasks executed with params', {
    title,
    categories,
    location,
    radiusKm,
    locationName,
  });

  return tasks.map((task) => {
    if (task.location && typeof task.location === 'object') {
      task.location = {
        lng: (task.location as any).lng,
        lat: (task.location as any).lat,
      };
    } else {
      task.location = undefined;
    }

    return task;
  });
};

/**
 * Changes the status of a task.
 * @param {number} taskId - ID of the task to update.
 * @param {TaskStatus} newStatus - New status of the task (e.g., OPEN, CLOSED, COMPLETED).
 * @returns {Promise<CachedTask>} The updated task.
 */
export const changeTaskStatusService = async (
  taskId: number,
  newStatus: TaskStatus
): Promise<CachedTask> => {
  const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existingTask) {
    logger.warn('❌ Attempted to change status of a task that does not exist', {
      taskId,
    });
    throw httpError(404, `Task with id ${taskId} not found`);
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
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

  logger.info('✅ Task status updated successfully', {
    taskId,
    newStatus,
  });

  return updatedTask;
};

/**
 * Creates a new host in the database.
 * Determines the type of host (USER or ORGANIZATION) based on the isOrganizationTask flag.
 * If the host is an organization, organizationId must be provided.
 * If the host is a user, userId must be provided.
 *
 * @param {boolean} isOrganizationTask - Flag indicating whether the host is an organization.
 * @param {string} [organizationId] - The ID of the organization (required if isOrganizationTask is true).
 * @param {number} [userId] - The ID of the user (required if isOrganizationTask is false).
 * @returns {Promise<HostData>} The created host object, including its ID, type, and associated user or organization ID.
 * @throws {Error} If required parameters are missing based on the host type.
 */
export const createHostService = async (
  isOrganization: boolean,
  organizationId?: string,
  userId?: number
): Promise<HostData> => {
  if (isOrganization && !organizationId) {
    logger.error(
      '❌ Attempted to create an organization host without organizationId'
    );
    throw httpError(
      400,
      'Organization ID is required when isOrganization is true'
    );
  }
  if (!isOrganization && !userId) {
    logger.error('❌ Attempted to create a user host without userId');
    throw httpError(400, 'User ID is required when isOrganization is false');
  }

  const host = await prisma.host.upsert({
    where: isOrganization
      ? { organizationId: organizationId! }
      : { userId: userId! },
    update: {},
    create: {
      type: isOrganization ? 'ORGANIZATION' : 'USER',
      organizationId: isOrganization ? organizationId : null,
      userId: isOrganization ? null : userId,
    },
  });

  logger.info(host ? '✅ Created or fetched host' : '⚡ Using existing host', {
    hostId: host.id,
    type: host.type,
  });

  return {
    id: host.id,
    type: host.type,
    userId: host.userId,
    organizationId: host.organizationId,
  };
};
