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
// import { getCache, setCache } from '@/utils/cache';
// import { parseLocation } from '@/utils/locationParses';
import logger from '@/utils/logger';
import { Prisma, TaskStatus } from '@prisma/client';
import { ensureLocation, reverseGeocode } from './geocoding.service';

/**
 * Creates a task with proper PostGIS location handling.
 * @param {CreateTaskInput} data - Task data from request.
 * @param {string} userId - ID of the user creating the task.
 * @returns {Promise<CachedTask>} The created task including host and joined users.
 */
export const createTask = async (
  data: CreateTaskInput,
  userId: string
): Promise<CachedTask> => {
  const { categories, isOrganization, organizationId, location, ...rest } =
    data;

  const host = await createHost(isOrganization, organizationId, userId);

  let locationId: number | null = null;

  if (location) {
    const geoData = await reverseGeocode(location.lat, location.lng);

    if (geoData) {
      locationId = await ensureLocation({
        country: geoData.country,
        region: geoData.region,
        city: geoData.city,
      });
    }
  }

  const categoriesArray = `{${categories.join(',')}}`;

  const insertSQL = `
    INSERT INTO "Task"
      (
        title,
        description,
        picture,
        "hostId",
        "startDate",
        "startTime",
        "endDate",
        location,
        "locationId",
        "locationName",
        amount,
        "currentAmount",
        currency,
        requirements,
        categories,
        "createdAt",
        "updatedAt"
      )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        CASE
          WHEN $8::double precision IS NOT NULL AND $9::double precision IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography
          ELSE NULL
        END,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16::"CategoryType"[],
        NOW(),
        NOW()
      )
    RETURNING id;
  `;

  const values = [
    rest.title, // $1
    rest.description, // $2
    rest.picture ?? null, // $3
    host.id, // $4
    new Date(rest.startDate), // $5
    new Date(rest.startTime), // $6
    rest.endDate ? new Date(rest.endDate) : null, // $7
    location?.lng ?? null,   // $8
    location?.lat ?? null,   // $9
    locationId ?? null,      // $10
    rest.locationName ?? null, // $11
    rest.amount ?? null,     // $12
    rest.currentAmount ?? null, // $13
    rest.currency ?? null,   // $14
    rest.requirements ?? null, // $15
    categoriesArray,         // $16
  ];


  let createdTaskId: string;

  try {
    const result = await prisma.$queryRawUnsafe<{ id: string }[]>(
      insertSQL,
      ...values
    );

    createdTaskId = result[0]?.id;
  } catch (err) {
    logger.error('❌ Error creating task', { error: err });
    throw httpError(500, 'Failed to create task');
  }

  if (!createdTaskId) {
    logger.error('❌ Task creation returned no result');
    throw httpError(500, 'Task creation failed');
  }

  const taskWithRelations = await getTaskById(createdTaskId);

  if (!taskWithRelations) {
    throw httpError(500, 'Failed to fetch created task with relations');
  }

  // await refreshAllTasksCache();

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
const isTaskExists = async (data: CreateTaskInput): Promise<boolean> => {
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
 * @param {string} taskId - ID of the task to retrieve.
 * @returns {Promise<CachedTask | null>} The task if found, otherwise null.
 */
const getTaskById = async (taskId: string): Promise<CachedTask | null> => {
  const sql = buildTasksBaseQuery(Prisma.sql`WHERE t.id = ${taskId}`)
  const task = await prisma.$queryRaw<CachedTask[]>(sql);

  if (!task.length) {
    logger.warn(`❌ Task with id ${taskId} not found`);
    return null;
  }

  return task[0];
};

/**
 * Fetches all tasks from the database, including host, joined users, and organization, with caching.
 * @returns {Promise<CachedTask[]>} An array of tasks.
 */
const getAllTasks = async (): Promise<CachedTask[]> => {
  // const cacheTasksKey = 'allTasks';
  // const cachedTasks = await getCache<CachedTask[]>(cacheTasksKey);

  // if (cachedTasks) {
  //   logger.info('✅ All tasks fetched from cache');
  //   return cachedTasks;
  // }

  // const sql = Prisma.sql([buildTasksBaseQuery()]);
  const sql = buildTasksBaseQuery();
  const tasks: CachedTask[] = await prisma.$queryRaw<CachedTask[]>(sql);

  // await setCache<CachedTask[]>(cacheTasksKey, tasks, 600);
  logger.info('✅ All tasks fetched from DB and cached');

  return tasks;
};

/**
 * Deletes a task by its ID.
 * @param {string} taskId - ID of the task to delete.
 * @returns {Promise<any>} The deleted task.
 */
const deleteTask = async (taskId: string) => {
  const deletedTask = await prisma.task.delete({
    where: { id: taskId },
  });

  if (!deletedTask) {
    logger.error(`❌ Task ${taskId} not found for deletion`);
    throw httpError(404, `Task with id ${taskId} not found`);
  }

  logger.info('✅ Task deleted successfully', { taskId });

  // await refreshAllTasksCache();

  return deletedTask;
};

/**
 * Updates an existing task by ID.
 * Categories and other editable fields can be updated.
 * Host and status cannot be changed here.
 * @param {UpdateTaskInput} data - Updated task data.
 * @returns {Promise<CachedTask>} The updated task.
 */
const updateTask = async (
  data: UpdateTaskInput,
  taskId: string
): Promise<CachedTask> => {
  const existingTask = await getTaskById(taskId);

  if (!existingTask) {
    logger.warn('❌ Attempted to update a task that does not exist', {
      taskId,
    });
    throw httpError(404, `Task with id ${taskId} not found`);
  }

  const { location, ...restData } = data;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(restData).length > 0) {
      await tx.task.update({
        where: { id: taskId },
        data: restData,
      });
    }

    // await refreshAllTasksCache();

    if (location === null) {
      await tx.$executeRaw`
        UPDATE "Task"
        SET location = NULL
        WHERE id = ${taskId}
      `;
    } else if (location) {
      await tx.$executeRaw`
        UPDATE "Task"
        SET location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography
        WHERE id = ${taskId}
      `;
    }
  });

  const updatedTaskRaw = await getTaskById(taskId);

  if (!updatedTaskRaw) {
    logger.error(`❌ Task ${taskId} not found after update`);
    throw httpError(500, 'Failed to fetch updated task');
  }

  logger.info('✅ Task updated successfully', { taskId });

  return updatedTaskRaw;
};


/**
 * Refreshes the cache for all tasks by fetching them from the database.
 * @returns {Promise<void>}
 */
// const refreshAllTasksCache = async (): Promise<void> => {
//   const tasks = await prisma.task.findMany({
//     include: {
//       host: {
//         include: {
//           user: true,
//           organization: true,
//         },
//       },
//       joinedUsers: true,
//     },
//   });

//   const tasksWithParsedLocation: CachedTask[] = tasks.map((task: any) => ({
//     ...task,
//     location: task.location ? parseLocation(task.location) : undefined,
//   }));

//   await setCache<CachedTask[]>('allTasks', tasksWithParsedLocation, 600);
// };

/**
 * Searches tasks with optional filters: title, categories, location + radius.
 * Returns tasks along with full host info (user or organization).
 * @param {SearchTasksInput} params - Search parameters.
 * @returns {Promise<CachedTask[]>} Array of tasks with host details.
 */
const searchTasks = async (params: SearchTasksInput): Promise<CachedTask[]> => {
  const { title, categories, location, locationName, radiusKm } = params;

  const conditions: Prisma.Sql[] = [];

  if (title) {
    conditions.push(
      Prisma.sql`t.title ILIKE ${'%' + title + '%'}`
    );
  }

  if (categories && categories.length > 0) {
    conditions.push(
      Prisma.sql`t.categories && ${categories}::"CategoryType"[]`
    );
  }

  if (location && radiusKm) {
    conditions.push(
      Prisma.sql`
        ST_DWithin(
          t.location,
          ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography,
          ${radiusKm * 1000}
        )
      `
    );
  }

  if (locationName) {
    conditions.push(
      Prisma.sql`t."locationName" ILIKE ${'%' + locationName + '%'}`
    );
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : undefined;

  const sql = buildTasksBaseQuery(whereClause);

  const tasks = await prisma.$queryRaw<CachedTask[]>(sql);

  logger.info('✅ searchTasks executed with params', {
    title,
    categories,
    location,
    radiusKm,
    locationName,
  });

  return tasks;
};

/**
 * Changes the status of a task.
 * @param {string} taskId - ID of the task to update.
 * @param {TaskStatus} newStatus - New status of the task (e.g., OPEN, CLOSED, COMPLETED).
 * @returns {Promise<CachedTask>} The updated task.
 */
const changeTaskStatus = async (
  taskId: string,
  newStatus: TaskStatus
): Promise<CachedTask> => {
  const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existingTask) {
    logger.warn('❌ Attempted to change status of a task that does not exist', {
      taskId,
    });
    throw httpError(404, `Task with id ${taskId} not found`);
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus },
  });

  // await refreshAllTasksCache();

  const taskWithRelations = await getTaskById(taskId);

  if (!taskWithRelations) {
    throw httpError(500, 'Failed to fetch updated task');
  }

  logger.info('✅ Task status updated successfully', {
    taskId,
    newStatus,
  });

  return taskWithRelations;
};

/**
 * Creates a new host in the database.
 * Determines the type of host (USER or ORGANIZATION) based on the isOrganizationTask flag.
 * If the host is an organization, organizationId must be provided.
 * If the host is a user, userId must be provided.
 *
 * @param {boolean} isOrganizationTask - Flag indicating whether the host is an organization.
 * @param {string} [organizationId] - The ID of the organization (required if isOrganizationTask is true).
 * @param {string} [userId] - The ID of the user (required if isOrganizationTask is false).
 * @returns {Promise<HostData>} The created host object, including its ID, type, and associated user or organization ID.
 * @throws {Error} If required parameters are missing based on the host type.
 */
const createHost = async (
  isOrganization: boolean,
  organizationId?: string,
  userId?: string
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

  if (isOrganization) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      logger.error(
        `❌ Organization with organizationId ${organizationId} not found`
      );
      throw httpError(400, 'Organization not found');
    }
  }

  if (!isOrganization && !userId) {
    logger.error('❌ Attempted to create a user host without userId');
    throw httpError(400, 'User ID is required when isOrganization is false');
  }

  const host = await prisma.host.upsert({
    where: isOrganization
      ? { organizationId: organizationId! }
      : { userId: userId! },
    update: isOrganization
      ? { type: 'ORGANIZATION', userId: null }
      : { type: 'USER', organizationId: null },
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

const getTasksByHostId = async (hostId: number): Promise<CachedTask[]> => {
  const sql = buildTasksBaseQuery(Prisma.sql`WHERE t."hostId" = ${hostId}`);
  return prisma.$queryRaw<CachedTask[]>(sql);
};

export const taskServices = {
  isTaskExists,
  getTaskById,
  getAllTasks,
  deleteTask,
  updateTask,
  searchTasks,
  changeTaskStatus,
  createHost,
  createTask,
  getTasksByHostId
};
