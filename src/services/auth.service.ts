import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { User } from '@prisma/client';

interface CreateUser {
  name: string;
  email: string;
  password: string;
  emailVerificationCode: string;
  emailVerificationExpiresAt: Date;
  siteRole?: 'USER' | 'ADMIN';
}

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

  return newUser;
};

export const findUserByEmailService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userSettings: true, 
    },
  });

  logger.info('🔍 User lookup by email in service', { email, found: !!user });
  return user;
};

export const findUserByIdService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userSettings: true,
      hostedTasks: true,
      joinedTasks: true,
      reviewsWritten: true,
      reviewsReceived: true,
      organizations: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      },
      location: true,
      paymentOptions: true,
    },
  });

  logger.info('🔍 User lookup by ID in service', { id, found: !!user });
  return user;
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
  userId: number
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

export const saveRefreshTokenService = async (
  userId: number,
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

export const deleteUserRefreshTokensService = async (
  userId: number
): Promise<{ count: number }> => {
  try {
    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    logger.info('✅ Refresh tokens deleted successfully', {
      userId,
      deletedCount: deletedTokens.count,
    });

    return deletedTokens;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('❌ Failed to delete refresh tokens', {
        userId,
        error: error.message,
      });
    } else {
      logger.error('❌ Failed to delete refresh tokens: Unknown error', {
        userId,
        error,
      });
    }
    throw error;
  }
};
