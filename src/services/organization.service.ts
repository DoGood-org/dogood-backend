import { prisma } from '@/lib/prisma';
import {
  Organization,
  User,
  UserOrganization,
  JoinRequestStatus,
  JoinRequest,
  UserProfile,
  NotificationType,
  EntityType,
  JoinRequestDirection,
  OrganizationRole,
} from '@prisma/client';
import {
  CreateJoinRequestInput,
  CreateOrgParams,
  FullOrganization,
  UpdateRoleMemberInput,
} from '@/types/organization.types';
import logger from '@utils/logger';
import { httpError } from '@/helpers/httpError';
import { ErrorCode } from '@/constants/apiCodes';
import { notificationService } from './notification.service';


/**  --------------------------------ORGANIZATION SERVICES --------------------------
 * createOrganization
 * findOrganizationByName
 * findOrganizationsByName
 * findOrganizationById
 * updateOrganization
 * deleteOrganization
*/

/**
 * Creates a new organization and links it to the given user as ADMIN.
 *
 * @param {Object} params - Parameters for creating an organization.
 * @returns {Promise<Organization>} - Created organization with ADMIN membership.
 */
const createOrganization = async (
  params: CreateOrgParams 
): Promise<Organization> => {
  const { userId, location, ...rest } = params;

  return await prisma.organization.create({
    data: {
      ...rest, 
      location: location ? {
        create: {
          country: location.country ?? undefined,
          region: location.region ?? undefined,
          city: location.city ?? undefined,
        }
      } : undefined, 
      
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
      members: true,
    },
  });
};

/**
 * Finds an organization by its unique name.
 *
 * @param {string} name - Name of the organization to search for.
 * @returns {Promise<Organization | null>} - The organization if found, otherwise null.
 */
const findOrganizationByName = async (
  name: string
): Promise<Organization | null> => {
  const existingOrg = await prisma.organization.findUnique({
    where: { name },
  });

  if (!existingOrg) {
    logger.info(
      `🔍 Organization with name ${name} not found by name in service`
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
  const { location, name, ...rest } = data;

  return await prisma.organization.update({
    where: { id },
    data: {
      ...rest,
      ...(name && { name }),
      ...(location && {
        location: {
          upsert: {
            update: {
              country: location.country,
              region: location.region,
              city: location.city,
            },
            create: {
              country: location.country,
              region: location.region,
              city: location.city,
            },
          },
        },
      }),
    },
    include: { 
      location: true 
    },
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
  await tx.joinRequest.deleteMany({
    where: {
      OR: [
        { senderOrganizationId: organizationId },
        { receiverOrganizationId: organizationId },
      ],
    },
  });

  await tx.task.deleteMany({ where: { host: { organizationId } } });
  await tx.host.deleteMany({ where: { organizationId } });
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

/**  --------------------------------MEMBER SERVICES --------------------------
 * getOrganizationMembers
 * updateMemberRole
 * findMembership
 * requireMembership
 * removeMemberFromOrganization
*/

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
 * Updates the role of a member in an organization and notifies them if they are promoted.
 *
 * @param {UpdateRoleMemberInput} params - Object containing organizationId, targetUserId, and newRole.
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
    include: {
      organization: {
        select: { name: true }
      }
    }
  });

  // Notify the user about the new role
  await notificationService.createNotification({
    userId: targetUserId,
    type: NotificationType.ORG_ROLE_UPDATED, 
    relatedId: organizationId,
    entityType: EntityType.ORGANIZATION,
    metadata: {
      orgName: updatedMembership.organization.name,
      newRole: newRole 
    }
  });

  logger.info('✅ User role updated and notification sent', {
    targetUserId,
    organizationId,
    newRole,
  });

  return updatedMembership;
};


/**
 * Finds a membership record for a user in a specific organization.
 *
 * @param {string} userId - ID of the user.
 * @param {string} organizationId - ID of the organization.
 * @returns {Promise<UserOrganization | null>} - The membership record if found; otherwise, `null`.
 */

const findMembership = async (
  userId: string,
  organizationId: string
): Promise<UserOrganization | null> => {
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

return membership;
};

/**
 * Ensures that a user is a member of a specific organization.
 *
 * @param {string} userId - ID of the user.
 * @param {string} organizationId - ID of the organization.
 * @returns {Promise<UserOrganization>} - The user's membership record.
 * @throws {HttpError} - Throws a 404 error if the user is not a member of the organization.
 */

const requireMembership = async (
  userId: string,
  organizationId: string,
): Promise<UserOrganization> => {
   const membership = await findMembership(userId, organizationId);

  if (!membership) {
    logger.error('❌ User is not a member of this organization', { userId, organizationId });
    throw httpError(
      404,
      'User is not a member of this organization',
      ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION
    );
  }

  return membership;
};

/**
 * Removes a user from an organization and notifies them.
 * * @param {string} userId - ID of the user to remove.
 * @param {string} organizationId - ID of the organization.
 * @returns {Promise<UserOrganization>} - The deleted membership record.
 */
const removeMemberFromOrganization = async (
  userId: string,
  organizationId: string
): Promise<UserOrganization | null> => {

  await requireMembership(userId, organizationId);

  const deletedMember = await prisma.userOrganization.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: {
        select: { name: true }
      }
    }
  });

  // Notify the user using the data from the deleted record
  await notificationService.createNotification({
    userId: userId,
    type: NotificationType.ORG_MEMBER_REMOVED,
    relatedId: organizationId,
    entityType: EntityType.ORGANIZATION,
    metadata: {
      orgName: deletedMember.organization.name
    }
  });

  logger.info('✅ Member removed and notified', { userId, organizationId });

  return deletedMember;

};

/**  --------------------------------JOIN-REQUEST SERVICES --------------------------
 * createJoinRequest
 * updateJoinRequestStatus
 * isJoinRequestExisting
 * getJoinRequestsForOrganization
 * getPendingJoinRequest

*/

/**
 * Creates a join request and notifies the recipient.
 * 
 * If direction is FROM_USER: Notifies organization admins and moderators.
 * If direction is FROM_ORGANIZATION: Notifies the invited user.
 *
 * @param {CreateJoinRequestInput} data - Payload containing sender, receiver, and direction info.
 * @returns {Promise<JoinRequest>} - The newly created join request record with sender/receiver details.
 */
const createJoinRequest = async (
  data: CreateJoinRequestInput
): Promise<JoinRequest> => {
  // 1. Create the request and include necessary relations for notifications
  const request = await prisma.joinRequest.create({
    data: {
      senderId: data.senderId,
      senderOrganizationId: data.senderOrganizationId, // Now including sender org for invites
      receiverOrganizationId: data.receiverOrganizationId,
      receiverUserId: data.receiverUserId,
      direction: data.direction,
      status: JoinRequestStatus.PENDING,
    },
    include: {
      sender: { select: { name: true } },
      senderOrganization: { select: { name: true } },
      receiverOrganization: { select: { name: true } },
      receiverUser: { select: { name: true } }
    }
  });

  // --- Notification Logic ---

  // SCENARIO A: User wants to join an Organization (FROM_USER)
  if (request.direction === JoinRequestDirection.FROM_USER && request.receiverOrganizationId) {
    const staffMembers = await prisma.userOrganization.findMany({
      where: {
        organizationId: request.receiverOrganizationId,
        role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
        status: 'ACTIVE'
      },
      select: { userId: true }
    });

    if (staffMembers.length > 0) {
      const notificationPromises = staffMembers.map(member => 
        notificationService.createNotification({
          userId: member.userId,
          type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
          relatedId: request.receiverOrganizationId!,
          joinRequestId: request.id,
          entityType: EntityType.ORGANIZATION,
          metadata: {
            userName: request.sender?.name || 'A user',
            orgName: request.receiverOrganization?.name
          }
        })
      );
      await Promise.all(notificationPromises);
    }
  } 
  
  // SCENARIO B: Organization invites a User (FROM_ORGANIZATION)
  else if (request.direction === JoinRequestDirection.FROM_ORGANIZATION && request.receiverUserId) {
    await notificationService.createNotification({
      userId: request.receiverUserId,
      type: NotificationType.ORG_JOIN_REQUEST_RECEIVED, // You can use the same type or create ORG_INVITE_RECEIVED
      relatedId: request.senderOrganizationId!,
      joinRequestId: request.id,
      entityType: EntityType.ORGANIZATION,
      metadata: {
        orgName: request.senderOrganization?.name || 'An organization',
        userName: request.receiverUser?.name // Just for consistency
      }
    });
  }

  logger.info('✅ Join request/invite created and recipient notified', { 
    requestId: request.id, 
    direction: request.direction 
  });

  return request;
};

/**
 * Updates the status of a join request and handles side effects (membership creation & notifications).
 * 
 * @param {string} joinRequestId - The ID of the request to update.
 * @param {JoinRequestStatus} newStatus - The target status (ACCEPTED, REJECTED or CANCELLED).
 * @param {string} actingUserId - The ID of the user performing the action.
 * @returns {Promise<JoinRequest>} The updated join request.
 */
 const updateJoinRequestStatus = async (
  joinRequestId: string,
  newStatus: JoinRequestStatus,
  actingUserId: string
): Promise<JoinRequest> => {
  const joinRequest = await prisma.joinRequest.findFirst({
    where: { id: joinRequestId, status: JoinRequestStatus.PENDING },
    include: {
      sender: { select: { name: true } },
      receiverUser: { select: { name: true } },
      senderOrganization: { select: { name: true } },
      receiverOrganization: { select: { name: true } }
    }
  });

   if (!joinRequest) {
    logger.error('❌ Pending join request not found for update', { joinRequestId });
    throw httpError(404, 'Pending join request not found');
  }

  // Authorization rules for user join requests:
  //
  // - Request sender: CANCEL
  // - Organization ADMIN or MODERATOR: ACCEPT / REJECT
  if (joinRequest.direction === JoinRequestDirection.FROM_USER) {
    const isSenderCancellingRequest =
      actingUserId === joinRequest.senderId &&
      newStatus === JoinRequestStatus.CANCELLED;

    if (!isSenderCancellingRequest) {  
        const membership = await requireMembership(actingUserId, joinRequest.receiverOrganizationId!)

        if (
            !membership ||
            (membership.role !== 'ADMIN' &&
             membership.role !== 'MODERATOR')
        ) {
            logger.warn('❌ Unauthorized attempt to update join request status', { actingUserId, joinRequestId });
            throw httpError(403, 'Only organization staff can handle this request', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION);
        }
    }

  // Authorization rules for organization invitations:
  //
  // - Invited user: ACCEPT / REJECT
  // - Organization ADMIN or MODERATOR: CANCEL
  } else if (joinRequest.direction === JoinRequestDirection.FROM_ORGANIZATION) {
  const isReceiverHandlingInvitation =
    actingUserId === joinRequest.receiverUserId &&
    (
      newStatus === JoinRequestStatus.ACCEPTED ||
      newStatus === JoinRequestStatus.REJECTED
    );

  if (!isReceiverHandlingInvitation) {
    if (newStatus === JoinRequestStatus.CANCELLED) {
      const membership = await requireMembership(
        actingUserId,
        joinRequest.senderOrganizationId!
      );

      if (
        !membership ||
        (membership.role !== 'ADMIN' &&
          membership.role !== 'MODERATOR')
      ) {
        logger.warn('❌ Unauthorized attempt to cancel organization invitation', {
          actingUserId,
          joinRequestId,
        });

        throw httpError(
          403,
          'Only organization staff can cancel this invitation',
          ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
        );
      }

    } else {

      logger.warn('❌ Unauthorized attempt to update join request status', {
        actingUserId,
        joinRequestId,
      });

      throw httpError(
        403,
        'Only the invited user can accept or reject this invitation',
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
      );
    }
  }
}

  const updated = await prisma.joinRequest.update({
    where: { id: joinRequestId },
    data: { status: newStatus },
  });

  // Determine Target User and Org Name for Notifications
  const targetUserId = joinRequest.direction === JoinRequestDirection.FROM_USER 
    ? joinRequest.senderId 
    : joinRequest.receiverUserId;

  const organizationId = joinRequest.direction === JoinRequestDirection.FROM_USER
    ? joinRequest.receiverOrganizationId
    : joinRequest.senderOrganizationId;

  const orgName = joinRequest.direction === JoinRequestDirection.FROM_USER
    ? joinRequest.receiverOrganization?.name
    : joinRequest.senderOrganization?.name;

  // Handle ACCEPTED logic (Create Member + Success Notification)
  if (newStatus === JoinRequestStatus.ACCEPTED && targetUserId && organizationId) {
    await prisma.userOrganization.create({
      data: {
        userId: targetUserId,
        organizationId: organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });

    await notificationService.createNotification({
      userId: targetUserId,
      type: NotificationType.ORG_JOIN_REQUEST_ACCEPTED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      metadata: { orgName: orgName || 'Organization' }
    });

    logger.info('✅ Membership created and user notified of acceptance', { targetUserId, organizationId });
  }

  //  Handle REJECTED logic (Only Notification)
  if (newStatus === JoinRequestStatus.REJECTED && targetUserId && organizationId) {
    await notificationService.createNotification({
      userId: targetUserId,
      type: NotificationType.ORG_JOIN_REQUEST_REJECTED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      metadata: { orgName: orgName || 'Organization' }
    });

    logger.info('❌ Request rejected and user notified', { targetUserId, organizationId });
  }

  return updated;
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
  const membership = await organizationServices.requireMembership(
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
          name: true,
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
    const membership = await organizationServices.requireMembership(
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
  getOrganizationMembers,
  updateMemberRole,
  findMembership,
  requireMembership,
  removeMemberFromOrganization,
  createJoinRequest,
  updateJoinRequestStatus,
  isJoinRequestExisting,
  getJoinRequestsForOrganization,
  getPendingJoinRequest,
};