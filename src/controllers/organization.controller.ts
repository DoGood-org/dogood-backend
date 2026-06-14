import { NextFunction, Request, Response } from 'express';

import { asyncHandler } from "@/decorators/asyncHandler";
import logger from "@utils/logger";
import { httpError } from "@/helpers/httpError";
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { organizationServices } from '@/services/organization.service';
import { JoinRequestDirection } from '@prisma/client';

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

const updateOrganization = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const { id: organizationId } = req.params;
  const actingUserId = req.user!.id; 
  const data = req.body;

  const membership = await organizationServices.isMemberInOrganization(actingUserId, organizationId);
  
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

  const membership = await organizationServices.isMemberInOrganization(userId, organizationId);
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

    const actingMembership = await organizationServices.isMemberInOrganization(
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

    const existingMembership = await organizationServices.isMemberInOrganization(userId, organizationId);
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

  const checkRole = await organizationServices.isMemberInOrganization(userId, organizationId);

  if (!checkRole || (checkRole.role !== 'ADMIN' && checkRole.role !== 'MODERATOR')) {
      logger.warn('❌ User does not have permission to remove member from organization', { userId, organizationId });
    return next(httpError(403, 'Only ADMIN or MODERATOR can delete the other member', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION));
  }

 const deletedUser = await organizationServices.removeMemberFromOrganization(userId, organizationId);

  if (!deletedUser) {
      logger.warn('❌ Member not found in organization', { userId, organizationId });
    return next(httpError(404, 'Member not found in organization', ErrorCode.MEMBER_NOT_FOUND));
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.MEMBER_REMOVED_FROM_ORGANIZATION,
    message: 'Member removed from organization'
  });
};

const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {

  const { organizationId, userId, role } = req.body;

  const actingUserId = req.user?.id;
  if (!actingUserId) {
      logger.warn('❌ Unauthorized access to update member role', { organizationId, userId });
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const actingMembership = await organizationServices.isMemberInOrganization(actingUserId, organizationId);
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

const updateJoinRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { id: joinRequestId, status } = req.body;
  const actingUserId = req.user?.id;

  if (!joinRequestId) {
    return next(httpError(400, 'Join Request ID is required'));
  }
  
  const result = await organizationServices.updateJoinRequestStatus(joinRequestId, status, actingUserId!);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUEST_STATUS_UPDATED,
    message: 'Join request was updated successfully',
    data: { result }
  });
};

const getJoinRequestsForOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const { organizationId } = req.params;
  const actingUserId = req.user?.id;

  if (!organizationId) {
    return next(httpError(400, 'Organization ID is required'));
  }

  const joinRequests = await organizationServices.getJoinRequestsForOrganization(organizationId, actingUserId!);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUESTS_RETRIEVED,
    message: 'Join requests retrieved successfully',
    data: { joinRequests }
  });
}

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
