import { NextFunction, Request, Response } from 'express';
import { ErrorCode, SuccessCode } from "@/constants/apiCodes";
import { httpError } from "@/helpers/httpError";
import { adminServices } from "@/services/admin.service";
import logger from "@/utils/logger";
import { asyncHandler } from '@/decorators/asyncHandler';

export const getAllOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user!;

  if (user.siteRole !== 'ADMIN') {
    logger.warn('⚠️ Unauthorized access attempt to admin organizations list', {
      userId: user.id,
      role: user.siteRole,
    });
    return next(httpError(403, 'Forbidden: Admin access required', ErrorCode.FORBIDDEN));
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const search = (req.query.search as string)?.trim() || '';

  logger.info('👤 Admin fetching all organizations list', {
    adminId: user.id,
    page,
    limit,
    ...(search && { search }),
  });

  const result = await adminServices.getAllOrganizationsForAdmin(page, limit, search);

  return res.status(200).json({
    status: 'success',
    code: SuccessCode.ORGANIZATION_DATA_RETRIEVED,
    message: 'Organizations retrieved successfully',
    ...result,
  });
};

export const adminControllers = {
  getAllOrganizations: asyncHandler(getAllOrganizations)
};