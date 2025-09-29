import {prisma} from '@/lib/prisma';
import {Organization, User, UserOrganization, JoinRequestStatus} from '@prisma/client';
import {
  AddMemberToOrganization,
  CreateJoinRequestInput,
  UpdateOrganization
} from "@/types/organization.types";
import logger from "@utils/logger";
import {httpError} from "@/helpers/httpError";


export const createOrganizationService = async ({
  userId,
  organizationName,
}: {
  userId: string;
  organizationName: string;
}) => {
  const organization = await prisma.organization.create({
    data: {
      name : organizationName,
      members: {
        create: {
          userId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  });

  logger.info('✅ Organization created and linked to user', {
    organizationId: organization.id,
    userId,
  });

  return organization;
};

export const findOrganizationByNameService = async (
    organizationName: string
): Promise<Organization | null> => {

  return await isOrganizationExisting(organizationName);
};

export const addMemberToOrganizationService = async ({
    userId,
    organizationId,
    role = 'MEMBER',
    status = 'PENDING',
    }: AddMemberToOrganization) => {

  const member = await prisma.userOrganization.create({
    data: {
      userId,
      organizationId,
      role,
      status,
    },
  });

  logger.info('Added member to organization', {
    userId,
    organizationId,
    role,
    status,
  });

  return member;
};

export const getOrganizationMembersService = async (organizationId: string): Promise<(UserOrganization & { user: User })[]> => {

    return prisma.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
    });
};

export const removeMemberFromOrganizationService = async (userId: string, organizationId: string) => {

  await isOrganizationExisting(organizationId);

  const checkRole = await isMemberInOrganization(userId, organizationId);

  if (!checkRole || (checkRole.role !== 'ADMIN' && checkRole.role !== 'MODERATOR')) {
    throw httpError(403, 'Only ADMIN or MODERATOR can delete the other member');
  }

   const deletedMember = await prisma.userOrganization.deleteMany({
      where: {
        userId,
        organizationId,
      },
    });

   logger.info('✅ Member was deleted successfully', { deletedMember });

   return deletedMember;
};

export const createJoinRequestService = async(data: CreateJoinRequestInput) => {

  await isJoinRequestExisting(data);

  const request = await prisma.joinRequest.create({
    data: {
      senderId: data.senderId,
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: JoinRequestStatus.PENDING,
    },
  });

  logger.info('✅ Join request created successfully', { request });

  return request;
}

export const updateJoinRequestStatusService = async (id: string, newStatus: JoinRequestStatus ) => {

  const joinRequest = await getPendingJoinRequest(id);

  const updated = await prisma.joinRequest.update({
    where: { id },
    data: {
      status: newStatus,
    },
  });

  let userId: string | null | undefined;
  let organizationId: string | undefined;

  if (joinRequest.direction === 'FROM_USER') {
    userId = joinRequest.senderId ?? undefined;
    organizationId = joinRequest.receiverOrganizationId ?? undefined;
  } else if (joinRequest.direction === 'FROM_ORGANIZATION') {
    userId = joinRequest.receiverUserId ?? undefined;
    organizationId =
        joinRequest.senderOrganizationId ??
        joinRequest.senderId?.toString();
  }

  if (userId && organizationId) {
    await addMemberToOrganizationService({
      userId,
      organizationId,
      role: 'MEMBER',
      status: 'PENDING',
    });
  }

  return updated;
}

export const updateMemberRoleService = async (
    organizationId: string,
    actingUserId: string,
    targetUserId: string,
    newRole: 'MODERATOR' | 'MEMBER'
) => {

  const actingMembership = await isMemberInOrganization(actingUserId, organizationId);

  if (!actingMembership || actingMembership.role !== 'ADMIN') {
    throw httpError(403, 'Only ADMIN can update member roles');
  }

  const allowedRoles = ['MODERATOR', 'MEMBER'] as const;
  if (!allowedRoles.includes(newRole)) {
    throw httpError(400, 'Invalid role provided');
  }

  const updatedMembership = await prisma.userOrganization.update({
    where: {
      userId_organizationId: {
        userId: targetUserId,
        organizationId,
      },
    },
    data: {
      role: newRole,
    },
  });

  logger.info('✅ User role was updated successfully', { targetUserId, newRole });

  return updatedMembership;
};

export const updateOrganizationService = async (
    organizationId: string,
    actingUserId: string,
    data: UpdateOrganization
) => {

  const membership = await isMemberInOrganization(actingUserId, organizationId);

  if (!membership || membership.role === 'MEMBER' ) {
    throw httpError(403, 'Only ADMIN or MODERATOR can update organization');
  }

  const {
    name,
    description,
    phoneNumber,
    email,
    moreInfo,
    location,
  } = data;

  const updatedOrg = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name,
      description,
      phoneNumber,
      email,
      moreInfo,
      location: location
          ? {
            update: {
              country: location?.country,
              region: location?.region,
              city: location?.city,
            },
          }
          : undefined,
    },
  });

  logger.info('✅ Organization was updated successfully', { data });

  return updatedOrg;
};


export const deleteOrganizationService = async (
    organizationId: string,
    userId: string
) => {

  await isOrganizationExisting(organizationId);

  const host = await prisma.host.findUnique({
    where: { organizationId: organizationId },
    select: { userId: true },
  });

  if (!host) {
    throw httpError(404, 'Organization host not found');
  }

  if (host.userId !== userId) {
    throw httpError(403, 'Only host can delete the organization');
  }

  await prisma.$transaction(async (tx) => {

    const tasks = await tx.task.findMany({
      where: { organizationId },
      select: { id: true },
    });

    if (tasks.length > 0) {
      await tx.$executeRawUnsafe(`
      DELETE FROM "_JoinedTasks" 
      WHERE "taskId" IN (${tasks.map((t) => `'${t.id}'`).join(",")})
    `);
    }

    await tx.userOrganization.deleteMany({
      where: { organizationId },
    });

    await tx.review.deleteMany({
      where: {
        OR: [
          { authorOrganizationId: organizationId },
          { targetOrganizationId: organizationId },
        ],
      },
    });

    await tx.joinRequest.deleteMany({
      where: {
        OR: [
          { receiverOrganizationId: organizationId },   
          { senderId: host?.userId, direction: 'FROM_ORGANIZATION' } 
        ]
      }
    });

    await tx.host.deleteMany({
      where: { organizationId },
    });

    await tx.organization.delete({
      where: { id: organizationId },
    });
  });

  logger.info('✅  Organization and related data deleted successfully')
  return { message: 'Organization and related data deleted successfully' };
};


const isMemberInOrganization = async ( userId: string,organizationId: string ) => {
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    logger.error('✅ User is not a member of this organization', { userId });
    throw httpError(404, 'User is not a member of this organization');
  }

  return membership;
}

const isOrganizationExisting = async ( organizationId: string ) => {

  const existingOrg = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!existingOrg) {
    logger.info(`🔍 Organization with id ${organizationId} not found by name in service`);
    return null;
  }

  logger.info('🔍 Organization found', {
    organizationId: existingOrg.id,
  });
  return existingOrg;
}

const isJoinRequestExisting = async (data: CreateJoinRequestInput) => {

  const existing = await prisma.joinRequest.findFirst({
    where: {
      senderId: data.senderId,
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: JoinRequestStatus.PENDING,
    },
  });
  if (existing) {

    logger.warn('Join request already exists', {
      senderId: data.senderId,
      receiverUserId: data.receiverUserId,
    });

    throw httpError(400, 'Join request already exists');
  }

}

const getPendingJoinRequest = async (id: string) => {

  const jr = await prisma.joinRequest.findUnique({ where: { id } });

  if (!jr) {
    logger.error('✅ Join request not found', { id });
    throw httpError(400, 'Join request not found');
  }
  if (jr.status !== JoinRequestStatus.PENDING) {
    logger.error('✅ Join request already processed', { id });
    throw httpError(400, 'Join request already processed');
  }

  return jr;
};
