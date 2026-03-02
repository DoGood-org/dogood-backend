import {prisma} from '@/lib/prisma';
import {Organization, User, UserOrganization, JoinRequestStatus, JoinRequest, Prisma, UserProfile} from '@prisma/client';
import {
  AddMemberToOrganization,
  CreateJoinRequestInput,
  FullOrganization,
  UpdateOrganization,
  UpdateRoleMemberInput
} from "@/types/organization.types";
import logger from "@utils/logger";
import {httpError} from "@/helpers/httpError";
import { ErrorCode } from '@/constants/apiCodes';

/**
 * Creates a new organization and links it to the given user as ADMIN.
 *
 * @param {Object} params - Parameters for creating an organization.
 * @param {string} params.userId - ID of the user creating the organization.
 * @param {string} params.organizationName - Name of the new organization.
 * @returns {Promise<Organization>} - Created organization with ADMIN membership.
 */
 const createOrganization = async ({
  userId,
  organizationName,
}: {
  userId: string;
  organizationName: string;
}):Promise<Organization> => {
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

/**
 * Finds an organization by its unique name.
 *
 * @param {string} organizationName - Name of the organization to search for.
 * @returns {Promise<Organization | null>} - The organization if found, otherwise null.
 */
 const findOrganizationByName = async (
    organizationName: string
): Promise<Organization | null> => {

  const existingOrg = await prisma.organization.findUnique({
    where: { name: organizationName },
  });

  if (!existingOrg) {
    logger.info(`🔍 Organization with name ${organizationName} not found by name in service`);
    return null;
  }

  logger.info('🔍 Organization found', { existingOrg });
  return existingOrg;
 };
 
/**
 * 
 * @param  {string} name - part of the organization name to search for (case-insensitive, partial match).
 * @returns {Promise<Partial<Organization>[]>} - List of organizations matching the search term, limited to 20 results.
 */
const findOrganizationsByName = async (
  name: string
): Promise<Partial<Organization>[]> => {
  if (!name.trim()) return [];

  const organizations = await prisma.organization.findMany({
    where: {
      name: {
        contains: name.trim(),
        mode: 'insensitive',
      },
    },
    take: 20, 
    select: {
      id: true,
      name: true,
      avatar: true, 
    },
  });

  logger.info('🔍 Organizations found by name search', { 
    searchTerm: name, 
    count: organizations.length 
  });
  
  return organizations;
}

/**
 * Finds an organization by its unique ID and returns all related data.
 *
 * Includes members (with profiles), tasks (with locations and reviews),
 * organization reviews, written reviews, host profile, location, and payment option.
 *
 * @param {string} organizationId - ID of the organization to search for.
 * @returns {Promise<FullOrganization | null>} - Full organization data if found, otherwise null.
 */
 const findOrganizationById = async (organizationId: string):Promise<FullOrganization | null> => {
  const existingOrg = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      location: true,
      paymentOption: true,
      hostProfile: true,
      members: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
      tasks: {
        include: {
          locationName: true,
          organization: false, 
          reviews: true,
        },
      },
      reviews: {
        include: {
          authorUser: {
            include: {
              profile: true,
            },
          },
          authorOrganization: true,
          task: true,
        },
      },
      reviewsWrittenOrg: {
        include: {
          targetUser: {
            include: {
              profile: true,
            },
          },
          targetOrganization: true,
          task: true,
        },
      },
    },
  });

  if (!existingOrg) {
    logger.info(
      `🔍 Organization with id ${organizationId} not found by id in service`
    );
    return null;
  }

  logger.info('🔍 Organization found', {
    organizationId: existingOrg.id,
  });

  return existingOrg;
};

/**
 * Updates organization data (name, contacts, description, location).
 * 
 * - Only users with role ADMIN or MODERATOR in this organization can update it.
 * - If location is provided:
 *    - If organization already has a location, it will be updated.
 *    - If not, a new location will be created and linked.
 *
 * @param {string} organizationId - ID of the organization being updated.
 * @param {string} actingUserId - ID of the user performing the update.
 * @param {UpdateOrganization} data - Payload with updated organization fields.
 * @returns {Promise<Organization>} - Updated organization record.
 */
 const updateOrganization = async (
  organizationId: string,
  actingUserId: string,
  data: UpdateOrganization
):Promise<Organization> => {
  const membership = await isMemberInOrganization(actingUserId, organizationId);

  if (!membership || membership.role === 'MEMBER') {
    throw httpError(
      403,
      'Only ADMIN or MODERATOR can update organization', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
    );
  }

  const {
    organizationName,
    description,
    phoneNumber,
    email,
    moreInfo,
    location,
    avatar,
  } = data;

  const updatedOrg = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: organizationName,
      description,
      phoneNumber,
      email,
      moreInfo,
      avatar,
      ...(location && {
        location: {
          upsert: {
            create: {
              country: location.country,
              region: location.region,
              city: location.city,
            },
            update: {
              country: location.country,
              region: location.region,
              city: location.city,
            },
          },
        },
      }),
    },
  });

  logger.info('✅ Organization was updated successfully', {
    organizationId,
    actingUserId,
  });

  return updatedOrg;
};

/**
 * Deletes an organization and all related data.
 *
 * - Only the host of the organization can perform this action.
 * - Deletes all related:
 *    - Tasks and joined users
 *    - User memberships
 *    - Reviews authored by or targeting the organization
 *    - Join requests sent or received by the organization
 *    - Host record
 *
 * @param {string} organizationId - ID of the organization to delete.
 * @param {string} userId - ID of the user attempting to delete the organization (must be the host).
 * @returns {Promise<{ message: string }>} - Confirmation message after deletion.
 * @throws {HttpError} - 404 if host not found, 403 if user is not the host.
 */
 const deleteOrganization = async (
    organizationId: string,
    userId: string
):Promise<{ message: string }> => {

  const host = await prisma.host.findUnique({
    where: { organizationId: organizationId },
    select: { userId: true },
  });

  if (!host) {
    throw httpError(404, 'Organization host not found', ErrorCode.USER_NOT_FOUND);
  }

  if (host.userId !== userId) {
    throw httpError(403, 'Only host can delete the organization', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION);
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


/**
 * Adds a user to an organization.
 * 
 * - This should be called after a join request is approved.
 * - Creates a record in the UserOrganization table linking the user to the organization.
 * - Default role is MEMBER, default status is ACTIVE.
 * @param {AddMemberToOrganization} param0 - Object containing userId, organizationId, role, and status.  
 * @returns {Promise<UserOrganization>} - Newly created membership record.
 */
 const addMemberToOrganization = async ({
    userId,
    organizationId,
    role = 'MEMBER',
    status = 'ACTIVE',
    }: AddMemberToOrganization):Promise<UserOrganization> => {

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

/**
 * Removes a user from an organization.
 * 
 * - Deletes the record linking the user to the organization in the UserOrganization table.
 * - Should only be used when the membership is being revoked.
 *
 * @param {string} userId - ID of the user to remove.
 * @param {string} organizationId - ID of the organization from which the user will be removed.
 * @returns {Promise<Prisma.BatchPayload>} - Information about the deletion (count of deleted records).
 */
 const removeMemberFromOrganization = async (userId: string, organizationId: string):Promise<Prisma.BatchPayload> => {

   const deletedMember = await prisma.userOrganization.deleteMany({
      where: {
        userId,
        organizationId,
      },
    });

   logger.info('✅ Member was deleted successfully', { deletedMember });

   return deletedMember;
};

/**
 * Creates a join request for a user or organization.
 * 
 * - A join request represents a pending action where a user or organization
 *   wants to join an organization or interact with a user/organization.
 * - The request is initially created with status PENDING.
 *
 * @param {CreateJoinRequestInput} data - Payload containing sender, receiver, and direction info.
 * @returns {Promise<JoinRequest>} - The newly created join request record.
 */
 const createJoinRequest = async(data: CreateJoinRequestInput):Promise<JoinRequest> => {
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

/**
 * Updates the status of a join request.
 * 
 * - Finds the join request by its ID and updates its status.
 * - If the new status is 'ACCEPTED', automatically adds the user to the organization.
 * - Handles both directions of the request:
 *    - FROM_USER: user requests to join an organization.
 *    - FROM_ORGANIZATION: organization invites a user.
 * 
 * @param {string} id - ID of the join request to update.
 * @param {JoinRequestStatus} newStatus - New status to set (PENDING, ACCEPTED, REJECTED, CANCELLED).
 * @returns {Promise<JoinRequest>} - The updated join request record.
 */
 const updateJoinRequestStatus = async (
  id: string,
  newStatus: JoinRequestStatus
):Promise<JoinRequest> => {
  const joinRequest = await getPendingJoinRequest(id);

  const updated = await prisma.joinRequest.update({
    where: { id },
    data: { status: newStatus },
  });

  if (newStatus === 'ACCEPTED') {
    let userId: string | undefined;
    let organizationId: string | undefined;

    if (joinRequest.direction === 'FROM_USER') {
      userId = joinRequest.senderId ?? undefined;
      organizationId = joinRequest.receiverOrganizationId ?? undefined;
    } else if (joinRequest.direction === 'FROM_ORGANIZATION') {
      userId = joinRequest.receiverUserId ?? undefined;
      organizationId = joinRequest.senderOrganizationId ?? undefined;
    }

    if (userId && organizationId) {
      await addMemberToOrganization({
        userId,
        organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      });
    }
  }

  return updated;
};

/**
 * Updates the role of a member in an organization.
 *
 * - Only use this service after verifying that the acting user has permission.
 * - Requires that the target user is already a member of the organization.
 *
 * @param {UpdateRoleMemberInput} params - Object containing:
 *    - organizationId: ID of the organization
 *    - targetUserId: ID of the user whose role is being updated
 *    - newRole: New role to assign ('MODERATOR' | 'MEMBER')
 * @returns {Promise<UserOrganization>} - Updated membership record.
 */
 const updateMemberRole = async ({
    organizationId,
    targetUserId,
    newRole}: UpdateRoleMemberInput
    
):Promise<UserOrganization> => {

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

/**
 * Retrieves all members of an organization, including their user data and profile.
 *
 * @param {string} organizationId - ID of the organization to fetch members for.
 * @returns {Promise<(UserOrganization & { user: User & { profile?: UserProfile | null } })[]>} 
 *          - List of organization members with their user details and optional profile.
 */
 const getOrganizationMembers = async (
  organizationId: string
): Promise<(UserOrganization & { user: User & { profile?: UserProfile | null } })[]> => {

  return prisma.userOrganization.findMany({
    where: { organizationId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });
};


/**
 * Checks if a user is a member of a specific organization.
 *
 * @param {string} userId - ID of the user to check.
 * @param {string} organizationId - ID of the organization.
 * @returns {Promise<UserOrganization>} - Membership record if user is a member.
 * @throws {HttpError} - 404 if the user is not a member of the organization.
 */
 const isMemberInOrganization = async ( userId: string,organizationId: string ):Promise<UserOrganization> => {
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
    throw httpError(404, 'User is not a member of this organization', ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION);
  }

  return membership;
}

/**
 * Checks if a pending join request already exists for the given parameters.
 *
 * @param {CreateJoinRequestInput} data - Join request data to check.
 * @returns {Promise<JoinRequest | null>} - Existing join request if found, otherwise null.
 */
 const isJoinRequestExisting = async (data: CreateJoinRequestInput):Promise<JoinRequest | null> => {
  const existing = await prisma.joinRequest.findFirst({
    where: {
      senderId: data.senderId,
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: JoinRequestStatus.PENDING,
    },
  });
  return existing;
}

/**
 * Retrieves a join request by ID and ensures it is still pending.
 *
 * @param {string} id - ID of the join request.
 * @returns {Promise<JoinRequest>} - The pending join request.
 * @throws {HttpError} - 400 if the join request does not exist or is already processed.
 */
  const getPendingJoinRequest = async (id: string):Promise<JoinRequest> => {

  const jr = await prisma.joinRequest.findUnique({ where: { id } });

  if (!jr) {
    logger.error('✅ Join request not found', { id });
    throw httpError(400, 'Join request not found', ErrorCode.JOIN_REQUEST_NOT_FOUND);
  }
  if (jr.status !== JoinRequestStatus.PENDING) {
    logger.error('✅ Join request already processed', { id });
    throw httpError(400, 'Join request already processed', ErrorCode.JOIN_REQUEST_ALREADY_PROCESSED);
  }

  return jr;
};


export const organizationServices = {
  createOrganization,
  findOrganizationByName,
  findOrganizationById,
  findOrganizationsByName,
  updateOrganization,
  deleteOrganization,
  addMemberToOrganization,
  createJoinRequest,
  removeMemberFromOrganization,
  updateJoinRequestStatus,
  updateMemberRole,
  getOrganizationMembers,
  isMemberInOrganization,
  isJoinRequestExisting,
}
