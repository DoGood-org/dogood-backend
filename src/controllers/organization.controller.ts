import {NextFunction, Request, Response} from 'express';
import {
    createJoinRequestService,
    updateJoinRequestStatusService,
    createOrganizationService,
    findOrganizationByNameService,
    getOrganizationMembersService,
    addMemberToOrganizationService,
    removeMemberFromOrganizationService,
    deleteOrganizationService,
    updateOrganizationService,
    updateMemberRoleService
} from '@/services/organization.service';
import {createUserService, findUserByEmailService} from "@/services/auth.service";
import {asyncHandler} from "@/decorators/asyncHandler";
import logger from "@utils/logger";
import {httpError} from "@/helpers/httpError";
import bcrypt from "bcrypt";
import {generateVerificationCode} from "@utils/generateVerificationCode";
import {addMinutes} from "date-fns";
import {getVerificationEmailHtml} from "@/emails/verificationEmail";
import {sendEmail} from "@utils/sendEmail";


const registerOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  const { name, email, password, organizationName } = req.body;
  const lang = req.query.lang as string | 'en';

  const existingUser = await findUserByEmailService(email);
  if (existingUser) {
    logger.warn('User already exists during company sign up', { email });
    return next(httpError(409, 'User already exists'));
  }

  const existingOrg = await findOrganizationByNameService(organizationName);
  if (existingOrg) {
    logger.warn('Organization already exists', { organizationName });
    return next(httpError(409, 'Organization with this name already exists'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const emailVerificationCode = generateVerificationCode();
  const emailVerificationExpiresAt = addMinutes(new Date(), 10);

  const newUser = await createUserService({
    name,
    email,
    password: hashedPassword,
    emailVerificationCode,
    emailVerificationExpiresAt,
    siteRole: 'USER',
  });

  await createOrganizationService({
    userId: newUser.id,
    organizationName,
  });

  const html = getVerificationEmailHtml(emailVerificationCode, lang);
  await sendEmail(newUser.email, 'Email Verification', html);

  res.status(201).json({
    status: 'success',
    message: 'Organization account created. Please verify your email.',
  });
};

const getOrganizationMembersController = async (
    req: Request,
    res: Response
) => {
  const { organizationId } = req.params;

  if (!organizationId) {
    logger.warn('Organization not found', { organizationId });
    throw httpError(400, 'organizationId parameter is required');
  }

  const members = await getOrganizationMembersService(organizationId);

  res.status(200).json({
      status: 'success',
      message: 'Member\'s list ready',
      data: { members}
  });
};


const updateOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const { organizationId } = req.params;
    const actingUserId = req.user?.id;
    const data = req.body;

    if (!organizationId) {
      return next(httpError(400, 'organizationId parameter is required'));
    }

    if (!actingUserId) {
      return next(httpError(401, 'Unauthorized: userId missing'));
    }

    const updatedOrg = await updateOrganizationService(organizationId, actingUserId, data);

    res.status(200).json({
        status: 'success',
        message: 'Organization was updated successfully',
        data: { updatedOrg }
    });
};

const deleteOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    const { organizationId } = req.params;
    const userId = req.user?.id;

    if (!organizationId) {
      return next(httpError(400, 'organizationId parameter is required'));
    }

    if (!userId) {
      return next(httpError(401, 'Unauthorized: userId missing'));
    }

    const result = await deleteOrganizationService(organizationId, userId);

    res.status(200).json({
        status: 'success',
        message: 'Organization and all related data were deleted',
        data: { result }
    });
};


const addMemberToOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  const { userId, organizationId, role, status } = req.body;

  if (!userId || !organizationId) {
    return next(httpError(400, 'userId and organizationId are required'));
  }

  const member = await addMemberToOrganizationService({
    userId,
    organizationId,
    role,
    status,
  });

  res.status(201).json({ message: 'Member added to organization', member });
};

const removeMemberFromOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { userId, organizationId } = req.body;

    if (!userId || !organizationId) {
      return next(httpError(400, 'userId and organizationId are required'));
    }

    await removeMemberFromOrganizationService(userId, organizationId);

    if (!userId ) {
      return next(httpError(404, 'Member not found in organization'));
    }

    res.status(200).json({ message: 'Member removed from organization' });
};

const createJoinRequest = async (req: Request, res: Response) => {

  const joinRequest = await createJoinRequestService(req.body);

  res.status(201).json({
    status: 'success',
    message: 'New join request was created',
    data: { joinRequest }
  });
};

const updateJoinRequestStatus = async (req: Request, res: Response) => {
  const {id, status} = req.body;

  const result = await updateJoinRequestStatusService(id, status);

  res.status(200).json({
    status: 'success',
    message: 'Join request was updated successfully',
    data: { result }
  });
};


const updateMemberRoleController = async (req: Request, res: Response, next: NextFunction) => {

    const {organizationId, userId, role} = req.body;

    const actingUserId = req.user?.id;
    if (!actingUserId) {
        return next(httpError(401, 'Unauthorized'));
    }

    const result = await updateMemberRoleService(organizationId, actingUserId, userId, role);

    res.status(200).json({
        status: 'success',
        message: 'User role was updated successfully',
        data: {result},
    });
};


export const organizationControllers = {
  registerOrganization: asyncHandler(registerOrganization),
  addMemberToOrganization: asyncHandler(addMemberToOrganizationController),
  getOrganizationMembers: asyncHandler(getOrganizationMembersController),
  removeMemberFromOrganization: asyncHandler(removeMemberFromOrganizationController),
  updateMemberRole: asyncHandler(updateMemberRoleController),
  createJoinRequest: asyncHandler(createJoinRequest),
  updateJoinRequestStatus: asyncHandler(updateJoinRequestStatus),
  updateOrganization: asyncHandler(updateOrganizationController),
  deleteOrganization: asyncHandler(deleteOrganizationController)
};




