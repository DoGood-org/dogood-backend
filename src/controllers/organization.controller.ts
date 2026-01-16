import { NextFunction, Request, Response } from 'express';

import { asyncHandler } from "@/decorators/asyncHandler";
import logger from "@utils/logger";
import { httpError } from "@/helpers/httpError";
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { organizationServices } from '@/services/organization.service';


const getOrganizationById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    logger.warn('OrganizationId parameter is not found', { id });
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  const organization = await organizationServices.findOrganizationById(id);

  if (!organization) {
    logger.warn('Organization not found', { id });
    return next(httpError(404, 'Organization not found', ErrorCode.ORGANIZATION_NOT_FOUND));
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DATA_RETRIEVED,
    message: 'Organization found',
    data: { organization }
  });
}

const updateOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const { organizationId } = req.params;
  const actingUserId = req.user?.id;
  const data = req.body;

  if (!organizationId) {
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  if (!actingUserId) {
    return next(httpError(401, 'Unauthorized: userId missing', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const updatedOrg = await organizationServices.updateOrganization(organizationId, actingUserId, data);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_UPDATED,
    message: 'Organization was updated successfully',
    data: { updatedOrg }
  });
};

const deleteOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const { organizationId } = req.params;
  const userId = req.user?.id;

  if (!organizationId) {
    return next(httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID));
  }

  if (!userId) {
    return next(httpError(401, 'Unauthorized: userId missing', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const result = await organizationServices.deleteOrganization(organizationId, userId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DELETED,
    message: 'Organization and all related data were deleted',
    data: { result }
  });
};

const getOrganizationMembers = async (
  req: Request,
  res: Response
) => {
  const { organizationId } = req.params;

  if (!organizationId) {
    logger.warn('Organization not found', { organizationId });
    throw httpError(400, 'organizationId parameter is required', ErrorCode.ORGANIZATION_ID_INVALID);
  }

  const members = await organizationServices.getOrganizationMembers(organizationId);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_MEMBERS_RETRIEVED,
    message: 'Member\'s list ready',
    data: { members }
  });
};

const addMemberToOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, organizationId, role, status } = req.body;

  if (!userId || !organizationId) {
    return next(httpError(400, 'userId and organizationId are required', ErrorCode.USER_ID_OR_ORGANIZATION_ID_INVALID));
  }

  const member = await organizationServices.addMemberToOrganization({
    userId,
    organizationId,
    role,
    status,
  });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.MEMBER_ADDED_TO_ORGANIZATION,
    message: 'Member added to organization',
    member
  });
};

const removeMemberFromOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, organizationId } = req.body;

  if (!userId || !organizationId) {
    return next(httpError(400, 'userId and organizationId are required', ErrorCode.USER_ID_OR_ORGANIZATION_ID_INVALID));
  }

  const organization = await organizationServices.findOrganizationById(organizationId);
  if (!organization) {
    throw httpError(404, 'Organization not found', ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const checkRole = await organizationServices.isMemberInOrganization(userId, organizationId);

  if (!checkRole || (checkRole.role !== 'ADMIN' && checkRole.role !== 'MODERATOR')) {
    throw httpError(403, 'Only ADMIN or MODERATOR can delete the other member', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION);
  }


  await organizationServices.removeMemberFromOrganization(userId, organizationId);

  if (!userId) {
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
    return next(httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED));
  }

  const actingMembership = await organizationServices.isMemberInOrganization(actingUserId, organizationId);
  if (!actingMembership || actingMembership.role !== 'ADMIN') {
    throw httpError(403, 'Only ADMIN can update member roles', ErrorCode.MEMBBER_DONT_HAVE_PERMISSION);
  }

  const allowedRoles = ['MODERATOR', 'MEMBER'] as const;
  if (!allowedRoles.includes(role)) {
    throw httpError(400, 'Invalid role provided', ErrorCode.MEMBER_ROLE_INVALID);
  }

  const result = await organizationServices.updateMemberRole({ organizationId, targetUserId: userId, newRole: role });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.MEMBER_ROLE_UPDATED,
    message: 'User role was updated successfully',
    data: { result },
  });
};

const createJoinRequest = async (req: Request, res: Response) => {
  const data = req.body;

  const existingJoinRequest = await organizationServices.isJoinRequestExisting(data);
  if (existingJoinRequest) {
    logger.warn('Join request already exists', {
      senderId: data.senderId,
      receiverUserId: data.receiverUserId,
    });

    throw httpError(400, 'Join request already exists', ErrorCode.JOIN_REQUEST_ALREADY_EXISTS);
  }

  const joinRequest = await organizationServices.createJoinRequest(data);

  res.status(201).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUEST_CREATED,
    message: 'New join request was created',
    data: { joinRequest }
  });
};

const updateJoinRequestStatus = async (req: Request, res: Response) => {
  const { id, status } = req.body;

  const result = await organizationServices.updateJoinRequestStatus(id, status);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.JOIN_REQUEST_STATUS_UPDATED,
    message: 'Join request was updated successfully',
    data: { result }
  });
};




export const organizationControllers = {
  getOrganizationById: asyncHandler(getOrganizationById),
  addMemberToOrganization: asyncHandler(addMemberToOrganization),
  getOrganizationMembers: asyncHandler(getOrganizationMembers),
  removeMemberFromOrganization: asyncHandler(removeMemberFromOrganization),
  updateMemberRole: asyncHandler(updateMemberRole),
  createJoinRequest: asyncHandler(createJoinRequest),
  updateJoinRequestStatus: asyncHandler(updateJoinRequestStatus),
  updateOrganization: asyncHandler(updateOrganization),
  deleteOrganization: asyncHandler(deleteOrganization)
};




