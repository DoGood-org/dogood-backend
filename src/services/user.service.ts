import { mapUserOrganizations } from '@/helpers/user.mapper';
import { prisma } from '@/lib/prisma';
import { UpdateUserSettingsInput } from '@/schemas/user.schema';
import { FullUser, PublicUser } from '@/types/user.types';
import logger from '@/utils/logger';
import { mergeUserTasks } from '@/utils/mergeUserTasks';
import { Gender } from '@prisma/client';

/**
 * Interface representing the data needed to update a user profile.
 */
export interface UpdateUserProfileInput {
  name: string;
  bio?: string | null;
  avatar?: string | null;
  location?: {
    country: string;
    region: string;
    city: string;
  } | null;
  gender?: Gender | null;
  birthDate?: Date | null;
  phoneNumber?: string | null;
  stripeCustomerId?: string | null;
}

/**
 * Finds a user by ID with related entities and builds a tasks list.
 *
 * - Loads user with settings, profile, location, payments, joined tasks, reviews, etc.
 * - If user is also a host, loads hosted tasks via raw SQL.
 * - Merges hosted and joined tasks into a single `tasks` array.
 *
 * @param {string} id - User ID.
 * @returns {Promise<FullUser | null>} User with tasks or null if not found.
 */
const findFullUserById = async (id: string): Promise<FullUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userSettings: true,
      profile: true,
      location: true,
      joinedTasks: true,
      reviewsWrittenUser: true,
      reviewsReceived: true,
      refreshTokens: true,
      organizations: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              avatar: true,
              description: true,
              createdAt: true,
              _count: {
                select: { members: true }
              }
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const organizations = mapUserOrganizations(user.organizations);

  const hostRecord = await prisma.host.findFirst({
    where: { type: 'USER', userId: id },
  });

  let hostedTasks: Array<any> = [];

  if (hostRecord) {
    hostedTasks = await prisma.$queryRaw<Array<any>>`
    SELECT
      t.id,
      t.title,
      t.description,
      t.picture,
      t."hostId",
      t."startDate",
      t."startTime",
      t."endDate",
      CASE
        WHEN t.location IS NOT NULL THEN json_build_object(
          'lat', ST_Y(t.location::geometry),
          'lng', ST_X(t.location::geometry)
        )
      ELSE NULL
      END AS location,     
      t."locationName",
      t.amount,
      t."currentAmount",
      t.currency,
      t.requirements,
      t.status::text,
      t.categories,
      t."createdAt",
      t."updatedAt"
    FROM "Task" t
    LEFT JOIN "Location" l ON t."locationId" = l.id
    WHERE t."hostId" = ${hostRecord.id}
  `;
  }

  const tasks = mergeUserTasks(hostedTasks, user.joinedTasks);

  const userWithFlattenedData = { 
    ...user, 
    organizations, 
    tasks 
  };

  logger.info('🔍 User lookup by ID in service', { id, found: !!user });



  return userWithFlattenedData;
};

/**
 * Finds a user's public profile by ID.
 * * - Includes: profile, location, reviews, and organizations.
 * - Fetches both hosted and joined tasks for public display.
 * - Excludes: settings, refresh tokens, and private system fields.
 *
 * @param {string} 
 * @returns {Promise<PublicUser | null>} 
 */
const findPublicProfileById = async (id: string):Promise<PublicUser | null>  => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      profile: true,
      location: true,
      joinedTasks: true,
      reviewsReceived: {
        include: {
          authorUser: {
            select: {
              name: true,
              profile: { select: { avatar: true } }
            }
          }
        }
      },
      organizations: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              avatar: true,
              description: true,
              _count: { select: { members: true } }
            },
          },
        },
      },
    },
  });

  if (!user) return null;


  const hostRecord = await prisma.host.findFirst({
    where: { type: 'USER', userId: id },
  });

  let hostedTasks: Array<any> = [];

  if (hostRecord) {
    hostedTasks = await prisma.$queryRaw<Array<any>>`
      SELECT
        t.id, t.title, t.description, t.picture, t."hostId",
        t."startDate", t."startTime", t."endDate",
        CASE
          WHEN t.location IS NOT NULL THEN json_build_object(
            'lat', ST_Y(t.location::geometry),
            'lng', ST_X(t.location::geometry)
          )
          ELSE NULL
        END AS location,     
        t."locationName", t.amount, t."currentAmount", t.currency,
        t.status::text, t.categories, t."createdAt"
      FROM "Task" t
      WHERE t."hostId" = ${hostRecord.id}
    `;
  }


  const tasks = mergeUserTasks(hostedTasks, user.joinedTasks);

  logger.info('👤 Public profile lookup', { id, found: !!user });

  return { ...user, tasks };
};

/**
 * Updates the user's main profile information, including nested location and payment options.
 * * @param {string} userId - The unique identifier of the user.
 * @param {UpdateUserProfileInput} data - The profile data to update.
 * @returns {Promise<any>} The updated user object with included relations.
 */
const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileInput
) => {
  const {
    location,
    stripeCustomerId,
    name, 
    ...profileData 
  } = data;

  return await prisma.user.update({
    where: { id: userId },
    data: {
      name, 
      profile: {
        upsert: {
          create: profileData,
          update: profileData,
        },
      },
      location: location
        ? {
            upsert: {
              create: location,
              update: location,
            },
          }
        : undefined,
      stripeCustomerId: stripeCustomerId,

    },
    include: {
      profile: true, 
      location: true,
    },
  });
};

/**
 * Updates or creates settings for a specific user.
 * * @param {string} userId - The unique identifier of the user.
 * @param {UpdateUserSettingsInput} data - The settings data to upsert.
 * @returns {Promise<any>} The updated or created user settings.
 */
const updateUserSettings = async (
  userId: string,
  data: UpdateUserSettingsInput
) => {
  const updatedSettings = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  return updatedSettings;
};

/**
 * Deletes a user and all related data (messages, chats, reviews, etc.) within a transaction.
 * Also performs cleanup of orphaned locations.
 * * @param {string} userId - The unique identifier of the user to delete.
 * @returns {Promise<{ success: boolean }>} An object indicating the success of the operation.
 */
const deleteUser = async (userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const host = await tx.host.findUnique({ where: { userId } });
    
    if (host) {
      await tx.task.deleteMany({ where: { hostId: host.id } });
    }

    await tx.user.delete({
      where: { id: userId },
    });

    await tx.location.deleteMany({
      where: {
        users: { none: {} },
        organization: { none: {} },
        tasks: { none: {} },
      },
    });

    return { success: true };
  });
};

/**
 * Searches for users by name using a partial, case-insensitive match.
 * * @param {string} name - The search query (name or part of it).
 * @returns {Promise<Array<{id: string, name: string, profile: {avatar: string | null} | null}>>} A list of users.
 */
const findUsersByName = async (name: string) => {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: name,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      profile: {
        select: {
          avatar: true,
        },
      },
    },
    take: 10,
  });

  return users;
};

export const userServices = {
  findFullUserById,
  findPublicProfileById,
  updateUserProfile,
  updateUserSettings,
  deleteUser,
  findUsersByName
};