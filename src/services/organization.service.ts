import {prisma} from '@/lib/prisma';
import {Organization, Status, User, UserOrganization} from '@prisma/client';
import {AddMemberToOrganization, createJoinRequestInput, CreateOrganization} from "@/types/organization.types";
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

  logger.info('🏢 Organization created and linked to user', {
    organizationId: organization.id,
    userId,
  });

  return organization;
};

export const findOrganizationByNameService = async (
    organizationName: string
): Promise<Organization | null> => {
  return await prisma.organization.findUnique({
    where: {name: organizationName},
  });
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

export const removeMemberFromOrganizationService = async (userId: number, organizationId: string) => {
  return prisma.userOrganization.deleteMany({
    where: {
      userId,
      organizationId,
    },
  });
};

export const createJoinRequestService = async(data: createJoinRequestInput) => {

  await isJoinRequestExisting(data);

  const request = prisma.joinRequest.create({
    data: {
      senderId: data.senderId,
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: Status.PENDING,
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

  if (status === Status.ACCEPTED) {
    const userId =
        joinRequest.direction === 'FROM_USER'
            ? joinRequest.senderId
            : joinRequest.receiverUserId;

    const organizationId =
        joinRequest.direction === 'FROM_ORGANIZATION'
            ? joinRequest.receiverOrganizationId
            : joinRequest.senderId.toString();

    if (userId && organizationId) {
      await addMemberToOrganizationService({ userId, organizationId });
    }
  }

  return updated;
}


const isJoinRequestExisting = async (data: createJoinRequestInput) => {

  const existing = await prisma.joinRequest.findFirst({
    where: {
      senderId: data.senderId,
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: Status.PENDING,
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
  if (jr.status !== Status.PENDING) {
    logger.error('✅ Join request already processed', { id });
    throw httpError(400, 'Join request already processed');
  }

  return jr;
};
