import { prisma } from '@/lib/prisma';
import { AuthenticatedUser, CreateUser, updateRefreshToken as UpdateRefreshTokenDTO, UserWithProfileAndSettings } from '@/types/user.types';
import logger from '@/utils/logger';
import { RefreshToken, User } from '@prisma/client';

/**
 * Creates a new user and its related user settings.
 *
 * - Sets default `siteRole` to "USER".
 * - Marks email as not verified and stores verification data.
 *
 * @param {CreateUser} data - Payload with user and settings data.
 * @returns {Promise<User>} The created user.
 */
const createUser = async (data: CreateUser): Promise<User> => {
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
  });

  logger.info('✅ User settings created in service', { userId: newUser.id });
  return newUser;
};

/**
 * Finds a user by email with related settings and profile.
 *
 * @param {string} email - User email to search by.
 * @returns {Promise<UserWithProfileAndSettings | null>} The user with relations or null if not found.
 */
const findUserByEmail = async (
  email: string
): Promise<UserWithProfileAndSettings | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userSettings: true,
      profile: true,
    },
  });

  logger.info('🔍 User lookup by email in service', { email, found: !!user });
  return user as UserWithProfileAndSettings | null;
};

/**
 * Finds a user by ID with data for authentication and active status check.
 * @param {string} id - User ID.
 * @returns {Promise<AuthenticatedUser | null>} User data for token validation or null if not found.
 */
const findAuthUser = async (id: string): Promise<AuthenticatedUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      name: true,
      siteRole: true,
      status: true,
      banType: true,
      banReason: true,
      banExpiresAt: true,
      bannedById: true,
    },
  });

  if (!user) return null;

  const isUnbanned = await checkAndReleaseBan(
    user.id,
    user.status as string,
    user.banType as string,
    user.banExpiresAt
  );

  if (isUnbanned && user.status === 'BANNED') {
    user.status = 'ACTIVE';
  }

  return user as unknown as AuthenticatedUser;
};

/**
 * Finds a user by email verification code if it is still valid.
 *
 * @param {string} code - The email verification code.
 * @returns {Promise<User | null>} The user or null if not found/expired.
 */
const findUserByVerificationCode = async (
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

/**
 * Marks a user's email as verified and clears verification code/expiry.
 *
 * @param {string} userId - The ID of the user to update.
 * @returns {Promise<User>} The updated user record.
 */
const updateUserEmailVerified = async (
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

/**
 * Updates a user's email verification code and expiration date.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} newCode - The new verification code.
 * @param {Date} newExpiresAt - The new expiration date for the code.
 * @returns {Promise<User>} The updated user record.
 */
const renewVerificationCode = async (
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
};

/**
 * Creates or updates a refresh token for a user.
 * Ensures only one active refresh token per user.
 * @param {string} userId - The user's ID.
 * @param {string} token - The refresh token string.
 * @param {Date} expiresAt - Token expiration date.
 * @returns {Promise<RefreshToken | null>} The created or updated refresh token record.
 */
const saveRefreshToken = async (
  userId: string,
  token: string,
  expiresAt: Date
): Promise<RefreshToken> => {
  const tokenRecord = await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  logger.info('💾 Refresh token created', {
    userId,
    tokenId: tokenRecord.id,
  });

  return tokenRecord;
};

/**
 * Finds an active (not revoked) refresh token for a user.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} token - The refresh token string.
 * @returns {Promise<RefreshToken | null>} The refresh token record, or null if not found.
 */
const findRefreshToken = async (
  userId: string,
  token: string
): Promise<RefreshToken | null> => {
  return prisma.refreshToken.findFirst({
    where: {
      userId,
      token,
    },
  });
};

/**
 * Revokes a refresh token by setting revoked = true.
 * Useful for logging out a user or rotating tokens.
 * @param {string} tokenId - The ID of the refresh token to revoke.
 * @returns {Promise<RefreshToken | null>} The revoked refresh token record.
 */
const revokeRefreshToken = async (tokenId: string): Promise<RefreshToken | null> => {
  const revokedToken = await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { revoked: true },
  });

  logger.info('Refresh token revoked', {
    tokenId: revokedToken.id,
    userId: revokedToken.userId,
  });

  return revokedToken;
};

/**
 * Deletes all refresh tokens for a given user.
 *
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{ count: number }>} The number of deleted tokens.
 */
const deleteUserRefreshTokens = async (userId: string) => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};

/**
 * Revokes an existing refresh token and creates a new one.
 *
 * @param {object} params - Parameters for updating the refresh token.
 * @param {string} params.tokenId - ID of the token to revoke.
 * @param {string} params.newToken - New token string to create.
 * @param {Date} params.newExpiresAt - Expiration date for the new token.
 * @param {string} params.userId - ID of the user.
 * @returns {Promise<RefreshToken>} The revoked token record.
 */
const updateRefreshToken = async ({
  tokenId,
  newToken,
  newExpiresAt,
  userId,
}: UpdateRefreshTokenDTO): Promise<void> => {
  await prisma.$transaction([
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
};

/**
 * Deletes all expired refresh tokens for all users.
 * @returns {Promise<number>} Number of deleted tokens.
 */
const cleanupExpiredRefreshTokens = async (): Promise<number> => {
  const deleted = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      revoked: true, // only delete revoked tokens
    },
  });

  if (deleted.count > 0) {
    logger.info('🧹 Expired refresh tokens cleaned up globally', {
      deletedCount: deleted.count,
    });
  }

  return deleted.count;
};

/**
 * Saves a password reset token and its expiration date for a user.
 * @param userId - ID of the user.
 * @param passwordToken - The password reset token.
 * @param resetPasswordExpiresAt - Token expiration date.
 * @returns {Promise<User>} The updated user record.
 */
const saveResetPasswordToken = async ({
  userId,
  resetPasswordToken,
  resetPasswordExpiresAt }: {
    userId: string;
    resetPasswordToken: string;
    resetPasswordExpiresAt: Date;
  }
): Promise<User> => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { resetPasswordToken, resetPasswordExpiresAt },
  });
  logger.info('✅ User resetPasswordToken updated in service', { userId });
  return updatedUser;
};

/**
 * Finds a user by their password reset token, only if the token is still valid.
 * @param token - The password reset token.
 * @returns {Promise<User | null>} The user record or null if not found/expired.
 */
const findUserByResetPasswordToken = async (
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

/**
 * Updates a user's password and clears any existing reset token.
 * @param userId - The ID of the user.
 * @param newPassword - The new password to set.
 * @returns {Promise<User>} The updated user record.
 */
const updateUserPassword = async (
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

/**
 * Checks if a user's temporary ban has expired and lifts it if necessary.
 * * @param {string} userId - User ID
 * @param {string | null} status - Current user status
 * @param {string | null} banType - Current ban type (preset or CUSTOM)
 * @param {Date | null} banExpiresAt - Ban expiration timestamp
 * @returns {Promise<boolean>} True if the user was unbanned or is already ACTIVE, false if the ban is still active.
 */
const checkAndReleaseBan = async (
  userId: string,
  status: string | null,
  banType: string | null,
  banExpiresAt: Date | null
): Promise<boolean> => {
  if (status !== 'BANNED') return true; // Юзер не забанений, все ок

  // Якщо бан довічний, або немає дати закінчення — бан все ще активний
  if (banType === 'PERMANENT' || !banExpiresAt) return false;

  const isExpired = new Date() > new Date(banExpiresAt);

  if (isExpired) {
    logger.info('🔓 Temporary ban expired. Automatically unbanning user via service.', { userId });
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        banType: null,
        banReason: null,
        banExpiresAt: null,
        bannedById: null,
      },
    });

    return true; // Успішно розбанено
  }

  return false; // Термін бану ще не минув
};

export const authServices = {
  createUser,
  findUserByEmail,
  findAuthUser,
  findUserByVerificationCode,
  updateUserEmailVerified,
  renewVerificationCode,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  deleteUserRefreshTokens,
  updateRefreshToken,
  cleanupExpiredRefreshTokens,
  saveResetPasswordToken,
  findUserByResetPasswordToken,
  updateUserPassword,
  checkAndReleaseBan,
};
