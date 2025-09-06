import {NextFunction, Request, Response} from 'express';
import {
  createJoinRequestService,
  updateJoinRequestStatusService,
  createOrganizationService,
  findOrganizationByNameService,
  getOrganizationMembersService,
  addMemberToOrganizationService,
  removeMemberFromOrganizationService
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

  const existingUser = await findUserByEmailService(email);
  if (existingUser) {
    logger.warn('User already exists during company sign up', { email });
    return next(httpError(409, 'User already exists'));
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

  const existingOrg = await findOrganizationByNameService(organizationName);
  if (existingOrg) {
    logger.warn('Organization already exists', { organizationName });
    return next(httpError(409, 'Organization with this name already exists'));
  }

  await createOrganizationService({
    userId: newUser.id,
    organizationName,
  });

  const html = getVerificationEmailHtml(emailVerificationCode);
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
    throw httpError(400, 'organizationId parameter is required');
  }

  const members = await getOrganizationMembersService(organizationId);

  res.status(200).json({ members });
};

const addMemberToOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  try {
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

    logger.info('Added member to organization', {
      userId,
      organizationId,
      role,
      status,
    });

    res.status(201).json({ message: 'Member added to organization', member });
  } catch (error) {
    logger.error('Failed to add member to organization', { error });
    next(httpError(500, 'Internal Server Error'));
  }
};

const removeMemberFromOrganizationController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  try {
    const { userId, organizationId } = req.body;

    if (!userId || !organizationId) {
      return next(httpError(400, 'userId and organizationId are required'));
    }

    const result = await removeMemberFromOrganizationService(
        userId,
        organizationId
    );

    if (result.count === 0) {
      return next(httpError(404, 'Member not found in organization'));
    }

    res.status(200).json({ message: 'Member removed from organization' });
  } catch (error) {
    next(error);
  }
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


export const organizationControllers = {
  registerOrganization: asyncHandler(registerOrganization),
  addMemberToOrganizationController: asyncHandler(addMemberToOrganizationController),
  getOrganizationMembersController: asyncHandler(getOrganizationMembersController),
  removeMemberFromOrganizationController: asyncHandler(removeMemberFromOrganizationController),
  createJoinRequest: asyncHandler(createJoinRequest),
  updateJoinRequestStatus: asyncHandler(updateJoinRequestStatus)
};




