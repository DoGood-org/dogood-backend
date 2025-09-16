import {prisma} from '@/lib/prisma';
import {Organization, User, UserOrganization, OrganizationStatus} from '@prisma/client';
import {
  AddMemberToOrganization,
  CreateJoinRequestInput,
  CreateOrganization,
  UpdateOrganization
} from "@/types/organization.types";
import logger from "@utils/logger";
import {httpError} from "@/helpers/httpError";


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

  logger.info('✅ Organization created and linked to user', {
    organizationId: organization.id,
    userId,
  });

  return organization;
};

export const findOrganizationByNameService = async (
    organizationName: string
): Promise<Organization | null> => {

  await isOrganizationExisting(organizationName);
};

export const addMemberToOrganizationService = async ({
    userId,
    organizationId,
    role = 'MEMBER',
    status = 'PENDING',
    }: AddMemberToOrganization) => {
  return  prisma.userOrganization.create({
    data: {
      userId,
      organizationId,
      role,
      status,
    },
  });
};

export const getOrganizationMembersService = async (organizationId: string): Promise<(UserOrganization & { user: User })[]> => {

    return prisma.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
    });
};

export const removeMemberFromOrganizationService = async (userId: number, organizationId: string) => {

   const deletedMember = await prisma.userOrganization.deleteOne({
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
      status: OrganizationStatus.PENDING,
    },
  });

  logger.info('✅ Join request created successfully', { request });

  return request;
}

export const updateJoinRequestStatusService = async (id: string, status: string) => {

  const joinRequest = await getPendingJoinRequest(id);

  const updated = await prisma.joinRequest.update({
    where: { id },
    data: { status },
  });

  if (status === OrganizationStatus.ACCEPTED) {
    const userId =
        joinRequest.direction === 'FROM_USER'
            ? joinRequest.senderId
            : joinRequest.receiverUserId;

    const organizationId =
        joinRequest.direction === 'FROM_ORGANIZATION'
            ? joinRequest.receiverOrganizationId
            : joinRequest.senderId.toString();

    if (userId && organizationId) {
      await addMemberToOrganizationService({ userId, organizationId, role: 'MEMBER', status: 'PENDING'});
    }
  }

  return updated;
}

export const updateMemberRoleService = async (
    organizationId: string,
    userId: number,
    newRole: 'MODERATOR' | 'MEMBER'
) => {

  const membership = await isMemberInOrganization(userId, organizationId);

  if (membership.role !== 'ADMIN') {
    throw httpError(403, 'Only ADMIN can update organization');
  }

  const userUpdated = await prisma.userOrganization.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    data: {
      role: newRole,
    },
  });

  logger.info('✅ User role was updated successfully', { newRole });

  return userUpdated;
};

export const updateOrganizationService = async (
    organizationId: string,
    actingUserId: number,
    data: UpdateOrganization
) => {

  const membership = await isMemberInOrganization(actingUserId, organizationId);

  if (!membership || membership.role === 'MEMBER' ) {
    throw httpError(403, 'Only ADMIN or MODERATOR can update organization');
  }

  const updatedOrg = await prisma.organization.update({
    where: { id: organizationId },
    data: { ...data },
  });

  logger.info('✅ Organization was updated successfully', { data });

  return updatedOrg;
};


export const deleteOrganizationService = async (
    organizationId: string,
    userId: number
) => {

  await isOrganizationExisting(organizationId);

  const checkRole = await isMemberInOrganization(userId, organizationId);

  if (!checkRole || checkRole.role !== 'ADMIN') {
    throw httpError(403, 'Only ADMIN can delete the organization');
  }

  await prisma.$transaction([
    prisma.userOrganization.deleteMany({
      where: { organizationId },
    }),
    prisma.task.deleteMany({
      where: { organizationId },
    }),
    prisma.review.deleteMany({
      where: { organizationId },
    }),
    prisma.joinRequest.deleteMany({
      where: { receiverOrganizationId: organizationId },
    }),
    prisma.organization.delete({
      where: { id: organizationId },
    }),
  ]);

  logger.info('✅  Organization and related data deleted successfully')
  return { message: 'Organization and related data deleted successfully' };
};


const isMemberInOrganization = async ( userId: number,organizationId: string ) => {
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
      status: OrganizationStatus.PENDING,
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
  if (jr.status !== OrganizationStatus.PENDING) {
    logger.error('✅ Join request already processed', { id });
    throw httpError(400, 'Join request already processed');
  }

  return jr;
};
