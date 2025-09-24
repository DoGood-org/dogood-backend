import { prisma } from '@/lib/prisma';
import { CreateUser, updateRefreshToken } from '@/types/user.types';
import logger from '@/utils/logger';
import { mergeUserTasks } from '@/utils/mergeUserTasks';
import { User } from '@prisma/client';

export const createUserService = async (data: CreateUser): Promise<User> => {
  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      siteRole: 'USER',
      emailVerificationCode: data.emailVerificationCode,
      emailVerificationExpiresAt: data.emailVerificationExpiresAt,
      isEmailVerified: false,
    },
  });
  logger.info('✅ User created in service', {
    userId: newUser.id,
    email: newUser.email,
  });

  await prisma.userSettings.create({
    data: {
      userId: newUser.id,
      language: data.lang || 'en',
    },
  }),
    logger.info('✅ User settings created in service', { userId: newUser.id });
  return newUser;
};

export const findUserByEmailService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userSettings: true,
      profile: true,
    },
  });

  logger.info('🔍 User lookup by email in service', { email, found: !!user });
  return user;
};

export const findUserByIdService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userSettings: true,
      profile: true,
      location: true,
      paymentOptions: true,
      joinedTasks: true,
      reviewsWrittenUser: true,
      reviewsReceived: true,
      refreshTokens: true,
      organizations: {
        include: {
          organization: {
            select: { id: true, name: true, createdAt: true },
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
        status::text,
        categories,
        "createdAt",
        "updatedAt"
      FROM "Task"
      WHERE "hostId" = ${hostRecord.id}
    `;
  }

  const tasks = mergeUserTasks(hostedTasks, user.joinedTasks);

  logger.info('🔍 User lookup by ID in service', { id, found: !!user });

  return { ...user, tasks };
};

export const findUserByVerificationCodeService = async (
  code: string
): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationCode: code,
      emailVerificationExpiresAt: {
        gte: new Date(),
      },
    },
  });

  logger.info('🔍 User lookup by verification code in service', {
    code,
    found: !!user,
  });
  return user;
};

export const updateUserEmailVerifiedService = async (
  userId: string
): Promise<User> => {
  const user = prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiresAt: null,
    },
  });

  logger.info('✅ User email verified in service', { userId });
  return user;
};

export const renewVerificationCodeService = async (
  userId: string,
  newCode: string,
  newExpiresAt: Date
): Promise<User> => {
  const user = prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: newCode,
      emailVerificationExpiresAt: newExpiresAt,
    },
  });

  logger.info('✅ User verification code renewed in service', { userId });
  return user;
}

export const saveRefreshTokenService = async (
  userId: string,
  token: string,
  expiresAt: Date
) => {
  const tokenRecord = await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
  logger.info('✅ Refresh token saved in service', {
    userId,
    tokenId: tokenRecord.id,
  });
  return tokenRecord;
};

export const findRefreshTokenService = async (
  userId: string,
  token: string
) => {
  const dbToken = await prisma.refreshToken.findFirst({
    where: {
      userId: userId,
      token: token,
      revoked: false, // token isn't revoked
    },
  });
  return dbToken;
};

export const deleteUserRefreshTokensService = async (userId: string) => {
  const deletedTokens = await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  logger.info('✅ Refresh tokens deleted successfully', {
    userId,
    deletedCount: deletedTokens.count,
  });

  return deletedTokens;
};

export const updateRefreshTokenService = async ({
  tokenId,
  newToken,
  newExpiresAt,
  userId,
}: updateRefreshToken) => {
  const [createdToken] = await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revoked: true },
    }),
    prisma.refreshToken.create({
      data: {
        userId,
        token: newToken,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  return createdToken; // повертаємо новий токен
};

export const cleanupExpiredRefreshTokensService = async (userId: string) => {
  const deleted = await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });

  if (deleted.count > 0) {
    logger.info('Expired refresh tokens cleaned up', {
      userId,
      deletedCount: deleted.count,
    });
  }
};

export const saveResetPasswordTokenService = async (
  userId: string,
  passwordToken: string,
  resetPasswordExpiresAt: Date
): Promise<User> => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { resetPasswordToken: passwordToken, resetPasswordExpiresAt },
  });
  logger.info('✅ User resetPasswordToken updated in service', { userId });
  return updatedUser;
};

export const findUserByResetPasswordTokenService = async (
  token: string
): Promise<User | null> => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiresAt: {
        gte: new Date(),
      },
    },
  });

  logger.info('🔍 User lookup by reset password token in service', {
    token,
    found: !!user,
  });
  return user;
};

export const updateUserPasswordService = async (
  userId: string,
  newPassword: string
): Promise<User> => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });
  logger.info('✅ User password updated in service', { userId });
  return updatedUser;
};
