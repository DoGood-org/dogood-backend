import { prisma } from '@/lib/prisma';
import { UpdateUserSettingsInput } from '@/schemas/user.schema';
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
  paymentOptionIds?: number[];
}

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
    paymentOptionIds,
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
      paymentOptions: paymentOptionIds
        ? {
            set: paymentOptionIds.map((id) => ({ id: Number(id) })), // id в схемі Int
          }
        : undefined,
    },
    include: {
      profile: true, 
      paymentOptions: true,
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
  await prisma.$transaction(async (tx) => {
    await tx.userSettings.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.userOrganization.deleteMany({ where: { userId } });
    await tx.review.deleteMany({
      where: {
        OR: [{ authorUserId: userId }, { targetUserId: userId }],
      },
    });
    await tx.chatMessageReaction.deleteMany({ where: { userId } });
    await tx.readStatus.deleteMany({ where: { userId } });
    await tx.chatMessage.deleteMany({ where: { senderId: userId } });
    await tx.userStatusesInChat.deleteMany({ where: { userId } });
    await tx.chatRoom.deleteMany({ where: { ownerId: userId } });

    const host = await tx.host.findUnique({
      where: { userId },
    });
    if (host) {
      await tx.task.deleteMany({ where: { hostId: host.id } });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        joinedTasks: { set: [] },
        paymentOptions: { set: [] },
      },
    });

    await tx.user.delete({
      where: { id: userId },
    });

    await tx.location.deleteMany({
      where: {
        users: {
          none: {},
        },
      },
    });
  });

  return { success: true };
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
  updateUserProfile,
  updateUserSettings,
  deleteUser,
  findUsersByName
};