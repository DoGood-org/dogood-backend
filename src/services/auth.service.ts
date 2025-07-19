import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { Organization, UserOrganization, User } from '@prisma/client';

interface CreateUser {
  name: string;
  email: string;
  password: string;
  emailVerificationCode: string;
  emailVerificationExpiresAt: Date;
  siteRole?: 'USER' | 'ADMIN';
}
interface CreateOrganization {
  userId: number;
  organizationName: string;
}

interface AddMemberToOrganization {
  userId: number;
  organizationId: string;
  role?: 'ADMIN' | 'MANAGER' | 'MEMBER';
  status?: 'ACTIVE' | 'INVITED' | 'REMOVED' | 'PENDING';
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
  });

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

  return user;
};

export const findUserByVerificationCodeService = async (
  code: string
): Promise<User | null> => {
  return prisma.user.findFirst({
    where: {
      emailVerificationCode: code,
      emailVerificationExpiresAt: {
        gte: new Date(), 
      },
    },
  });
};

export const updateUserEmailVerifiedService = async (
  userId: number
): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiresAt: null,
    },
  });
};

export const createOrganizationService = async ({
  userId,
  organizationName,
}: CreateOrganization): Promise<Organization> => {
  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      members: {
        create: {
          userId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  });

  logger.info('🏢 Organization created and linked to user', {
    organizationId: organization.id,
    userId,
  });

  return organization;
};

export const findOrganizationByNameService = async (
  organizationName: string
): Promise<Organization | null> => {
  const existingOrg = await prisma.organization.findUnique({
    where: { name: organizationName },
  });
  return existingOrg;
};

export const addMemberToOrganizationService = async ({
  userId,
  organizationId,
  role = 'MEMBER',
  status = 'PENDING',
}: AddMemberToOrganization) => {
  return prisma.userOrganization.create({
    data: {
      userId,
      organizationId,
      role,
      status,
    },
  });
};

export const getOrganizationMembersService = async (
  organizationId: string
): Promise<(UserOrganization & { user: User })[]> => {
  return prisma.userOrganization.findMany({
    where: { organizationId },
    include: {
      user: true,
    },
  });
};

export const removeMemberFromOrganizationService = async (
  userId: number,
  organizationId: string
) => {
  return prisma.userOrganization.deleteMany({
    where: {
      userId,
      organizationId,
    },
  });
};
