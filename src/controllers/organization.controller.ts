import { NextFunction, Request, Response } from 'express';

import { asyncHandler } from "@/decorators/asyncHandler";
import logger from "@utils/logger";
import { httpError } from "@/helpers/httpError";
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { organizationServices } from '@/services/organization.service';
import { JoinRequestDirection } from '@prisma/client';

/**
 * Registers a new organization and assigns the authenticated user as its administrator.
 *
 * Workflow:
 * - Checks whether an organization with the same name already exists.
 * - Calls organizationServices.createOrganization() to create the organization.
 *
 * Calls:
 * - organizationServices.findOrganizationByName() – verifies that the organization name is unique.
 * - organizationServices.createOrganization() – creates the organization and its initial membership.
 *
 * @param {Request} req - Express request containing organization data.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the created organization in the response.
 *
 * @throws {HttpError}
 * - 409 if an organization with the same name already exists.
 */
const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;

  const { name } = req.body;

  const existingOrg = await organizationServices.findOrganizationByName(name);
  if (existingOrg) {
    logger.warn('❌ Organization already exists', { name });
    return next(httpError(409, 'Organization with this name already exists', ErrorCode.ORGANIZATION_ALREADY_EXISTS));
  }

  const newOrg = await organizationServices.createOrganization({
    userId: user.id,
    ...req.body 
  });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_CREATED,
    message: 'Organization was created successfully',
    data: {
      organization: newOrg
    }
  });
};

/**
 * Retrieves an organization by its ID.
 *
 * Workflow:
 * - Validates the organization ID.
 * - Calls organizationServices.findOrganizationById().
 *
 * Calls:
 * - organizationServices.findOrganizationById() – retrieves the organization from the database.
 *
 * @param {Request} req - Express request containing the organization ID in route parameters.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the organization details in the response.
 *
 * @throws {HttpError}
 * - 400 if the organization ID is missing.
 * - 404 if the organization is not found.
 */
const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    logger.warn('❌ OrganizationId parameter is not found', { id });
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  const organization = await organizationServices.findOrganizationById(id);

  if (!organization) {
    logger.warn('❌ Organization not found', { id });
    return next(httpError(404, 'Organization not found', ErrorCode.ORGANIZATION_NOT_FOUND));
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DATA_RETRIEVED,
    message: 'Organization found',
    data: { organization }
  });
}

/**
 * Searches organizations by name.
 *
 * Workflow:
 * - Validates the search query.
 * - Calls organizationServices.findOrganizationsByName().
 *
 * Calls:
 * - organizationServices.findOrganizationsByName() – searches organizations by name.
 *
 * @param {Request} req - Express request containing the organization name in query parameters.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends a list of matching organizations.
 *
 * @throws {HttpError}
 * - 400 if the name query parameter is missing or invalid.
 */
const getOrganizationsByName = async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.query;

  if (!name || typeof name !== 'string' || !name.trim()) {
    logger.warn('❌ Name query parameter is missing or invalid', { name });
    return next(httpError(
      400, 
      'Name query parameter is required and must be a non-empty string', 
      ErrorCode.ORGANIZATION_NAME_QUERY_INVALID
    ));
  }
  
  const organizations = await organizationServices.findOrganizationsByName(name.trim());

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DATA_RETRIEVED,
    message: 'Organizations found',
    data: [...organizations] 
  });
};

/**
 * Updates organization information.
 *
 * Workflow:
 * - Verifies that the authenticated user is a member of the organization.
 * - Ensures the user has the ADMIN role.
 * - Calls organizationServices.updateOrganization().
 *
 * Calls:
 * - organizationServices.requireMembership() – verifies that the user belongs to the organization.
 * - organizationServices.updateOrganization() – updates organization data.
 *
 * @param {Request} req - Express request containing the organization ID and updated data.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the updated organization.
 *
 * @throws {HttpError}
 * - 403 if the authenticated user is not an organization administrator.
 * - 404 if the organization membership does not exist.
 */
const updateOrganization = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { id: organizationId } = req.params;
  const actingUserId = req.user!.id; 
  const data = req.body;

  const membership = await organizationServices.requireMembership(actingUserId, organizationId);
  
  if (!membership || membership.role !== 'ADMIN') {
    logger.warn('🚫 Non-admin attempted to update organization', { organizationId, actingUserId });
    return next(httpError(403, 'Only ADMIN can manage organization settings'));
  }

  const updatedOrg = await organizationServices.updateOrganization(organizationId, data);

  logger.info('✅ Organization updated', { organizationId, actingUserId });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_UPDATED,
    message: 'Organization was updated successfully',
    data: { 
      organization: updatedOrg 
    }
  });
};

/**
 * Deletes an organization.
 *
 * Workflow:
 * - Validates the request.
 * - Verifies that the authenticated user is an organization member.
 * - Ensures the user has the ADMIN role.
 * - Calls organizationServices.deleteOrganization().
 *
 * Calls:
 * - organizationServices.requireMembership() – verifies that the user belongs to the organization.
 * - organizationServices.deleteOrganization() – removes the organization and its related data.
 *
 * @param {Request} req - Express request containing the organization ID.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the deletion result.
 *
 * @throws {HttpError}
 * - 400 if the organization ID is missing.
 * - 401 if the authenticated user is missing.
 * - 403 if the authenticated user is not an organization administrator.
 * - 404 if the organization membership does not exist.
 */
const deleteOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const organizationId  = req.params.id;
  const userId = req.user?.id;

  if (!organizationId) {
    logger.warn('❌ OrganizationId parameter is not found', { organizationId });
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  if (!userId) {
    logger.warn('❌ Unauthorized access to delete organization', { organizationId });
    return next(httpError(401, 'Unauthorized: userId missing', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const membership = await organizationServices.requireMembership(userId, organizationId);
    if (!membership || membership.role !== 'ADMIN') {
      return next(httpError(403, 'Only ADMIN can manage organization settings'));
 }
  const result = await organizationServices.deleteOrganization(organizationId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DELETED,
    message: 'Organization and all related data were deleted',
    data: { result }
  });
};


// -------------------------------MEMBERS ----------------------------------------------------


/**
 * Retrieves all members of a specific organization.
 *
 * Workflow:
 * - Validates the organization ID.
 * - Calls organizationServices.getOrganizationMembers() to retrieve all organization members.
 *
 * Calls:
 * - organizationServices.getOrganizationMembers() – retrieves all members of the organization.
 *
 * @param {Request} req - Express request containing the organization ID in route parameters.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the list of organization members.
 *
 * @throws {HttpError}
 * - 400 if the organization ID is missing.
 */
const getOrganizationMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { organizationId } = req.params;

  if (!organizationId) {
    logger.warn('❌ Organization not found', { organizationId });
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  const members = await organizationServices.getOrganizationMembers(organizationId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_MEMBERS_RETRIEVED,
    message: 'Member\'s list ready',
    data: { members }
  });
};

/**
 * Sends an invitation for a user to join an organization.
 *
 * Workflow:
 * - Verifies that the authenticated user belongs to the organization.
 * - Ensures the authenticated user has ADMIN or MODERATOR permissions.
 * - Prevents moderators from inviting administrators.
 * - Checks whether the target user is already a member of the organization.
 * - Creates a join request and sends a notification to the invited user.
 *
 * Calls:
 * - organizationServices.requireMembership() – verifies the inviter's membership.
 * - organizationServices.findMembership() – checks whether the invited user is already a member.
 * - organizationServices.createJoinRequest() – creates the invitation and triggers notification creation.
 *
 * @param {Request} req - Express request containing invitation data.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the created invitation.
 *
 * @throws {HttpError}
 * - 401 if the authenticated user is missing.
 * - 403 if the authenticated user lacks permission to invite members.
 * - 403 if a moderator attempts to invite an administrator.
 * - 404 if the authenticated user is not a member of the organization.
 * - 409 if the target user is already a member of the organization.
 */
const inviteMemberToOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    const { userId, organizationId, role } = req.body;
    const actingUserId = req.user?.id;

    if (!actingUserId) {
      return next(httpError(401, 'Unauthorized'));
    }

    const actingMembership = await organizationServices.requireMembership(
      actingUserId,
      organizationId
    );

    const hasPermission = 
      actingMembership && 
      (actingMembership.role === 'ADMIN' || actingMembership.role === 'MODERATOR');

    if (!hasPermission) {
      logger.warn('❌ Unauthorized attempt to invite member', { actingUserId, organizationId });
      return next(
        httpError(
          403, 
          'Only ADMIN or MODERATOR can invite members', 
          ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
        )
      );
    }

    if (actingMembership.role === 'MODERATOR' && role === 'ADMIN') {
      logger.warn('❌ MODERATOR cannot invite an ADMIN', { actingUserId, organizationId });
      return next(
        httpError(
          403, 
          'MODERATORS cannot invite ADMINS', 
          ErrorCode.MEMBBER_DONT_HAVE_PERMISSION
        )
      );
    }

    const existingMembership = await organizationServices.findMembership(userId, organizationId);
    if (existingMembership) {
      logger.warn('❌ User is already a member', { userId, organizationId });
      return next(
        httpError(
          409, 
          'User is already a member', 
          ErrorCode.USER_ALREADY_MEMBER
        )
      );
    }

    const invite = await organizationServices.createJoinRequest({
      senderId: actingUserId,
      senderOrganizationId: organizationId,
      receiverUserId: userId,
      direction: JoinRequestDirection.FROM_ORGANIZATION,
      // Status is PENDING by default in the service/DB
    });

    logger.info('✅ Invitation sent successfully', { 
      from: actingUserId, 
      to: userId, 
      org: organizationId 
    });

    return res.status(201).json({
      status: 'success',
      code: SuccessCode.JOIN_REQUEST_CREATED,
      message: 'Invitation has been sent to the user',
      data: { invite }
    });
};

/**
 * Removes a member from an organization.
 *
 * Workflow:
 * - Validates request parameters.
 * - Verifies that the organization exists.
 * - Verifies the acting user's membership and permissions.
 * - Removes the target user from the organization.
 *
 * Calls:
 * - organizationServices.findOrganizationById() – verifies that the organization exists.
 * - organizationServices.requireMembership() – verifies the acting user's membership.
 * - organizationServices.removeMemberFromOrganization() – removes the member.
 *
 * @param {Request} req - Express request containing the organization ID and target user ID.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends a success response after the member is removed.
 *
 * @throws {HttpError}
 * - 400 if userId or organizationId is missing.
 * - 403 if the authenticated user lacks permission to remove members.
 * - 404 if the organization does not exist.
 * - 404 if the target user is not a member of the organization.
 */
const removeMemberFromOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, organizationId } = req.body;

  if (!userId || !organizationId) {
    logger.warn('❌ userId and organizationId are required to remove member from organization', { userId, organizationId });
    return next(httpError(400, 'userId and organizationId are required', ErrorCode.USER_ID_OR_ORGANIZATION_ID_INVALID));
  }

  const organization = await organizationServices.findOrganizationById(organizationId);
  if (!organization) {
      logger.warn('❌ Organization not found', { organizationId });
    throw httpError(404, 'Organization not found', ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const actingUserId = req.user!.id;
  const checkRole = await organizationServices.requireMembership(actingUserId, organizationId);

  if (!checkRole || (checkRole.role !== 'ADMIN' && checkRole.role !== 'MODERATOR')) {
      logger.warn('❌ User does not have permission to remove member from organization', { userId, organizationId });
    return next(httpError(403, 'Only ADMIN or MODERATOR can delete the other member', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION));
  }

  await organizationServices.removeMemberFromOrganization(userId, organizationId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.MEMBER_REMOVED_FROM_ORGANIZATION,
    message: 'Member removed from organization'
  });
};

/**
 * Updates a member's role within an organization.
 *
 * Workflow:
 * - Verifies that the authenticated user belongs to the organization.
 * - Ensures the authenticated user has the ADMIN role.
 * - Validates the requested role.
 * - Updates the target member's role.
 *
 * Calls:
 * - organizationServices.requireMembership() – verifies the acting user's membership.
 * - organizationServices.updateMemberRole() – updates the member's role.
 *
 * @param {Request} req - Express request containing the organization ID, target user ID, and new role.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the updated membership information.
 *
 * @throws {HttpError}
 * - 400 if an invalid role is provided.
 * - 401 if the authenticated user is missing.
 * - 403 if the authenticated user is not an administrator.
 * - 404 if the authenticated user is not a member of the organization.
 */
const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {

  const { organizationId, userId, role } = req.body;

  const actingUserId = req.user?.id;
  if (!actingUserId) {
      logger.warn('❌ Unauthorized access to update member role', { organizationId, userId });
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const actingMembership = await organizationServices.requireMembership(actingUserId, organizationId);
  if (!actingMembership || actingMembership.role !== 'ADMIN') {
      logger.warn('❌ User does not have permission to update member role', { actingUserId, organizationId });
    return next(httpError(403, 'Only ADMIN can update member roles', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION));
  }

  const allowedRoles = ['MODERATOR', 'MEMBER'] as const;
  if (!allowedRoles.includes(role)) {
      logger.warn('❌ Invalid role provided for member', { role, organizationId, userId });
    return next(httpError(400, 'Invalid role provided', ErrorCode.MEMBER_ROLE_INVALID));
  }

  const result = await organizationServices.updateMemberRole({ organizationId, targetUserId: userId, newRole: role });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.MEMBER_ROLE_UPDATED,
    message: 'User role was updated successfully',
    data: { result },
  });
};


// --------------------------------JOIN REQUESTS----------------------------------------------------------------

/**
 * Creates a new join request.
 *
 * Workflow:
 * - Verifies that the user is authenticated.
 * - Combines the authenticated user's ID with the request payload.
 * - Checks whether an identical join request already exists.
 * - Creates a new join request and triggers the corresponding notification flow.
 *
 * Calls:
 * - organizationServices.isJoinRequestExisting() – checks for duplicate join requests.
 * - organizationServices.createJoinRequest() – creates the join request and sends notifications.
 *
 * @param {Request} req - Express request containing join request data.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the created join request.
 *
 * @throws {HttpError}
 * - 400 if an identical join request already exists.
 * - 401 if the authenticated user is missing.
 */
const createJoinRequest = async (req: Request, res: Response, next: NextFunction) => {
  const senderId = req.user?.id;

  if (!senderId) {
      logger.warn('❌ Unauthorized access to create join request', { senderId });
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const requestData = {
    ...req.body,
    senderId: senderId
  };

  const existingJoinRequest = await organizationServices.isJoinRequestExisting(requestData);
  
  if (existingJoinRequest) {
    logger.warn('❌ Join request already exists', {
      senderId: senderId,
      receiverId: requestData.receiverUserId || requestData.receiverOrganizationId,
    });
    return next(httpError(400, 'Join request already exists', ErrorCode.JOIN_REQUEST_ALREADY_EXISTS));
  }

  const joinRequest = await organizationServices.createJoinRequest(requestData);

  res.status(201).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUEST_CREATED,
    message: 'New join request was created',
    data: { joinRequest }
  });
};


/**
 * Updates the status of an existing join request.
 *
 * Workflow:
 * - Validates the join request ID.
 * - Calls organizationServices.updateJoinRequestStatus() to update the request.
 * - The service performs authorization, updates the request status,
 *   creates organization membership (if accepted), and sends notifications.
 *
 * Calls:
 * - organizationServices.updateJoinRequestStatus() – updates the join request and handles all related business logic.
 *
 * @param {Request} req - Express request containing the join request ID and new status.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the updated join request.
 *
 * @throws {HttpError}
 * - 400 if the join request ID is missing.
 * - 401 if the authenticated user is missing.
 * - 403 if the user is not authorized to update the request.
 * - 404 if the join request is not found.
 */
const updateJoinRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id: joinRequestId, status } = req.body;
  const actingUserId = req.user?.id;

  if (!joinRequestId) {
    return next(httpError(400, 'Join Request ID is required'));
  }

  if (!actingUserId) {
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }
  
  const result = await organizationServices.updateJoinRequestStatus(joinRequestId, status, actingUserId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUEST_STATUS_UPDATED,
    message: 'Join request was updated successfully',
    data: { result }
  });
};

/**
 * Retrieves all pending join requests for a specific organization.
 *
 * Workflow:
 * - Validates the organization ID.
 * - Calls organizationServices.getJoinRequestsForOrganization().
 * - The service verifies that the authenticated user has permission to view requests.
 *
 * Calls:
 * - organizationServices.getJoinRequestsForOrganization() – retrieves join requests available to organization staff.
 *
 * @param {Request} req - Express request containing the organization ID.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the list of join requests.
 *
 * @throws {HttpError}
 * - 400 if the organization ID is missing.
 * - 401 if the authenticated user is missing.
 * - 403 if the authenticated user does not have permission to view join requests.
 * - 404 if the organization is not found.
 */
const getJoinRequestsForOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { organizationId } = req.params;
  const actingUserId = req.user?.id;

  if (!organizationId) {
    return next(httpError(400, 'Organization ID is required'));
  }

  if (!actingUserId) {
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const joinRequests = await organizationServices.getJoinRequestsForOrganization(organizationId, actingUserId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUESTS_RETRIEVED,
    message: 'Join requests retrieved successfully',
    data: { joinRequests }
  });
}

/**
 * Retrieves a specific pending join request available to the authenticated user.
 *
 * Workflow:
 * - Validates the join request ID.
 * - Verifies that the user is authenticated.
 * - Calls organizationServices.getPendingJoinRequest().
 *
 * Calls:
 * - organizationServices.getPendingJoinRequest() – retrieves the join request and verifies user access.
 *
 * @param {Request} req - Express request containing the join request ID.
 * @param {Response} res - Express response.
 * @param {NextFunction} next - Express next middleware.
 *
 * @returns {Promise<void>} Sends the requested join request.
 *
 * @throws {HttpError}
 * - 400 if the join request ID is missing.
 * - 401 if the authenticated user is missing.
 * - 403 if the authenticated user is not allowed to access the join request.
 * - 404 if the join request is not found.
 */
const getJoinRequestById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const actingUserId = req.user?.id;

  if (!id) {
    return next(httpError(400, 'Join Request ID is required'));
  }

  if (!actingUserId) {
    logger.warn('❌ Unauthorized access to get join request by ID', { id });
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

    const joinRequest = await organizationServices.getPendingJoinRequest(actingUserId, id);

    res.status(200).json({
      status: 'success',
      data: { joinRequest }
    });
  
};

export const organizationControllers = {
  registerOrganization: asyncHandler(registerOrganization),
  getOrganizationById: asyncHandler(getOrganizationById),
  getOrganizationsByName: asyncHandler(getOrganizationsByName),
  inviteMemberToOrganization: asyncHandler(inviteMemberToOrganization),
  getOrganizationMembers: asyncHandler(getOrganizationMembers),
  removeMemberFromOrganization: asyncHandler(removeMemberFromOrganization),
  updateMemberRole: asyncHandler(updateMemberRole),
  createJoinRequest: asyncHandler(createJoinRequest),
  updateJoinRequestStatus: asyncHandler(updateJoinRequestStatus),
  updateOrganization: asyncHandler(updateOrganization),
  deleteOrganization: asyncHandler(deleteOrganization),
  getJoinRequestsForOrganization: asyncHandler(getJoinRequestsForOrganization),
  getJoinRequestById: asyncHandler(getJoinRequestById)
};
