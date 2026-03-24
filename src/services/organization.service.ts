import { prisma } from '@/lib/prisma';
import {
  Organization,
  User,
  UserOrganization,
  JoinRequestStatus,
  JoinRequest,
  Prisma,
  UserProfile,
} from '@prisma/client';
import {
  AddMemberToOrganization,
  CreateJoinRequestInput,
  CreateOrgParams,
  FullOrganization,
  UpdateRoleMemberInput,
} from '@/types/organization.types';
import logger from '@utils/logger';
import { httpError } from '@/helpers/httpError';
import { ErrorCode } from '@/constants/apiCodes';

/**
 * Creates a new organization and links it to the given user as ADMIN.
 *
 * @param {Object} params - Parameters for creating an organization.
 * @returns {Promise<Organization>} - Created organization with ADMIN membership.
 */
const createOrganization = async (
  params: CreateOrgParams
): Promise<Organization> => {
  const {
    userId,
    organizationName,
    description,
    phoneNumber,
    email,
    avatar,
    location,
  } = params;

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      description,
      phoneNumber,
      email,
      avatar,
      location: {
        create: {
          country: location.country,
          region: location.region,
          city: location.city,
        },
      },
      members: {
        create: {
          userId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      },
    },
    include: {
      location: true,
    },
  });

  logger.info('✅ Organization created with location', {
    organizationId: organization.id,
    locationId: organization.locationId,
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
    logger.info(
      `🔍 Organization with name ${organizationName} not found by name in service`
    );
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
    count: organizations.length,
  });

  return organizations;
};

/**
 * Finds an organization by its unique ID and returns all related data.
 *
 * Includes members (with profiles), tasks (with locations and reviews),
 * organization reviews, written reviews, host profile, location, and payment option.
 *
 * @param {string} organizationId - ID of the organization to search for.
 * @returns {Promise<FullOrganization | null>} - Full organization data if found, otherwise null.
 */
const findOrganizationById = async (
  organizationId: string
): Promise<FullOrganization | null> => {
  const existingOrg = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      location: true,
      paymentOption: true,
      hostProfile: {
        include: {
          tasks: {
            include: {
              // locationName: true,
              reviews: true,
            },
          },
        },
      },
      members: {
        select: {
          id: true,
          role: true,
          status: true,
          userId: true,
          organizationId: true,
          user: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  avatar: true,
                }
              }
            }
          }

        },
      },
      reviews: {
        include: {
          authorUser: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  avatar: true,
                },
              },
            },
          },
          authorOrganization: true,
          task: true,
        },
      },
      reviewsWrittenOrg: {
        include: {
          targetUser: {
            select: {
              id: true,
              name: true,
              profile: {
                select: {
                  avatar: true,
                },
              },
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

  const tasks = existingOrg.hostProfile?.tasks ?? [];
  const hostId = existingOrg.hostProfile?.id;

  const { hostProfile, ...organizationWithoutHostProfile } = existingOrg as any;
  const { tasks: _hostTasks } = hostProfile ?? {};

  return {
    ...organizationWithoutHostProfile,
    hostId,
    tasks,
  };
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
 * @param {UpdateOrganization} data - Payload with updated organization fields.
 * @returns {Promise<Organization>} - Updated organization record.
 */
const updateOrganization = async (
  id: string,
  data: any
): Promise<Organization> => {
  const { location, organizationName, ...rest } = data;

  return await prisma.organization.update({
    where: { id },
    data: {
      ...rest,
      name: organizationName,
      ...(location && {
        location: {
          update: location,
        },
      }),
    },
    include: { location: true },
  });
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
 * @returns {Promise<{ message: string }>} - Confirmation message after deletion.
 * @throws {HttpError} - 404 if host not found, 403 if user is not the host.
 */
const deleteOrganization = async (organizationId: string) => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { locationId: true },
  });

  if (!org) {
    throw httpError(404, 'Organization not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { host: { organizationId } } });
    await tx.userOrganization.deleteMany({ where: { organizationId } });
    await tx.review.deleteMany({
      where: {
        OR: [
          { authorOrganizationId: organizationId },
          { targetOrganizationId: organizationId },
        ],
      },
    });

    await tx.organization.delete({ where: { id: organizationId } });
    if (org.locationId) {
      await tx.location.delete({ where: { id: org.locationId } });
    }
  });
  logger.info('✅ Organization and related data deleted successfully', {
    organizationId,
  });
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
}: AddMemberToOrganization): Promise<UserOrganization> => {
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
const removeMemberFromOrganization = async (
  userId: string,
  organizationId: string
): Promise<Prisma.BatchPayload> => {
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
const createJoinRequest = async (
  data: CreateJoinRequestInput
): Promise<JoinRequest> => {
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
};

/**
 * Updates the status of a join request.
 * * - Uses getPendingJoinRequest to ensure the request exists and is PENDING.
 * - Validates permissions based on the request direction.
 * - If ACCEPTED, automatically creates organization membership.
 */
export const updateJoinRequestStatus = async (
  joinRequestId: string,
  newStatus: JoinRequestStatus,
  actingUserId: string
): Promise<JoinRequest> => {
  const joinRequest = await getPendingJoinRequest(actingUserId, joinRequestId);

  if (joinRequest.direction === 'FROM_USER') {
    const membership = await isMemberInOrganization(
      actingUserId,
      joinRequest.receiverOrganizationId!
    );

    if (
      !membership ||
      (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')
    ) {
      logger.warn('❌ Unauthorized staff action', {
        actingUserId,
        joinRequestId,
      });
      throw httpError(
        403,
        'Only organization staff can handle this request',
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
      );
    }
  } else if (joinRequest.direction === 'FROM_ORGANIZATION') {
    if (joinRequest.receiverUserId !== actingUserId) {
      logger.warn('❌ Unauthorized user action on invitation', {
        actingUserId,
        joinRequestId,
      });
      throw httpError(
        403,
        'Only the invited user can accept this invitation',
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
      );
    }
  }

  const updated = await prisma.joinRequest.update({
    where: { id: joinRequestId },
    data: { status: newStatus },
  });

  if (newStatus === 'ACCEPTED') {
    const userId =
      joinRequest.direction === 'FROM_USER'
        ? joinRequest.senderId
        : joinRequest.receiverUserId;

    const organizationId =
      joinRequest.direction === 'FROM_USER'
        ? joinRequest.receiverOrganizationId
        : joinRequest.senderOrganizationId;

    if (userId && organizationId) {
      await addMemberToOrganization({
        userId,
        organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      });
      logger.info('✅ User automatically added to organization', {
        userId,
        organizationId,
      });
    } else {
      logger.error('❌ Failed to auto-add member: missing IDs', {
        userId,
        organizationId,
      });
      throw httpError(422, 'Incomplete data for joining organization');
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
  newRole,
}: UpdateRoleMemberInput): Promise<UserOrganization> => {
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

  logger.info('✅ User role was updated successfully', {
    targetUserId,
    newRole,
  });

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
): Promise<
  (UserOrganization & { user: User & { profile?: UserProfile | null } })[]
> => {
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
const isMemberInOrganization = async (
  userId: string,
  organizationId: string
): Promise<UserOrganization> => {
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
    throw httpError(
      404,
      'User is not a member of this organization',
      ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION
    );
  }

  return membership;
};

/**
 * Checks if a pending join request already exists for the given parameters.
 *
 * @param {CreateJoinRequestInput} data - Join request data to check.
 * @returns {Promise<JoinRequest | null>} - Existing join request if found, otherwise null.
 */
const isJoinRequestExisting = async (
  data: CreateJoinRequestInput
): Promise<JoinRequest | null> => {
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
};

/**
 * Retrieves all pending join requests for a specific organization.
 * * - Validates that the acting user has ADMIN or MODERATOR permissions within the organization.
 * - Filters for requests where the organization is the receiver and the status is PENDING.
 * - Includes sender details (user/profile) and sender organization details.
 *
 * @param {string} organizationId - The ID of the organization to fetch requests for.
 * @param {string} actingUserId - The ID of the user performing the request (from session).
 * @returns {Promise<JoinRequest[]>} - A list of pending join requests with sender information.
 * @throws {HttpError} - 403 if the user is not a staff member of the organization.
 */
const getJoinRequestsForOrganization = async (
  organizationId: string,
  actingUserId: string
): Promise<JoinRequest[]> => {
  const membership = await organizationServices.isMemberInOrganization(
    actingUserId,
    organizationId
  );

  if (
    !membership ||
    (membership.role !== 'ADMIN' && membership.role !== 'MODERATOR')
  ) {
    logger.warn('❌ Unauthorized attempt to fetch join requests', {
      actingUserId,
      organizationId,
    });
    throw httpError(
      403,
      'Only organization staff can view join requests',
      ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
    );
  }

  const joinRequests = await prisma.joinRequest.findMany({
    where: {
      receiverOrganizationId: organizationId,
      status: 'PENDING',
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },

      senderOrganization: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  logger.info('✅ Join requests retrieved successfully', {
    organizationId,
    count: joinRequests.length,
  });
  return joinRequests;
};

/**
 * Retrieves a join request by ID and ensures it is still pending.
 *
 * @param {string} actingUserId - ID of the user trying to access the join request (for permission check).
 * @param {string} id - ID of the join request.
 * @returns {Promise<JoinRequest>} - The pending join request.
 * @throws {HttpError} - 400 if the join request does not exist or is already processed.
 */
const getPendingJoinRequest = async (
  actingUserId: string,
  id: string
): Promise<JoinRequest> => {
  const jr = await prisma.joinRequest.findUnique({
    where: { id },
    include: {
      sender: true,
      senderOrganization: true,
      receiverOrganization: true,
    },
  });

  if (!jr) {
    logger.error('❌ Join request not found', { id });
    throw httpError(
      404,
      'Join request not found',
      ErrorCode.JOIN_REQUEST_NOT_FOUND
    );
  }

  if (jr.status !== JoinRequestStatus.PENDING) {
    logger.warn('⚠️ Join request already processed', { id, status: jr.status });
    throw httpError(
      400,
      'Join request already processed',
      ErrorCode.JOIN_REQUEST_ALREADY_PROCESSED
    );
  }

  const isSender = jr.senderId === actingUserId;

  let isStaff = false;
  if (jr.receiverOrganizationId) {
    const membership = await organizationServices.isMemberInOrganization(
      actingUserId,
      jr.receiverOrganizationId
    );
    isStaff = !!(
      membership &&
      (membership.role === 'ADMIN' || membership.role === 'MODERATOR')
    );
  }

  if (!isSender && !isStaff) {
    logger.warn('❌ Unauthorized attempt to view join request', {
      actingUserId,
      requestId: id,
    });
    throw httpError(
      403,
      'You do not have permission to view this request',
      ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
    );
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
  getJoinRequestsForOrganization,
  getPendingJoinRequest,
};
