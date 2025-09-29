import { prisma } from '@/lib/prisma';
import { UpdateUserSettingsInput } from '@/schemas/user.schema';
import { Gender } from '@prisma/client';

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

export const updateUserProfileService = async (
  userId: string,
  data: UpdateUserProfileInput
) => {
  const { location, paymentOptionIds, ...userData } = data;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userData,
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
            set: paymentOptionIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      paymentOptions: true,
      location: true,
    },
  });

  return updatedUser;
};

export const updateUserSettingsService = async (
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

export const deleteUserService = async (userId: string) => {
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

    // delete task if user is host
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