import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { httpError } from '@/helpers/httpError';
import { taskServices } from '@/services/task.service';
import { prisma } from '@/lib/prisma';

/**
 * Middleware to authorize actions on a task.
 * Checks if the user can modify or delete a task.
 */
export const authorizeTaskUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    const siteRole = req.user?.siteRole;

    if (!userId) {
      return next(httpError(401, 'Authentication required'));
    }

    if (siteRole === 'ADMIN') return next();

    const task = await taskServices.getTaskById(taskId);
    if (!task) return next(httpError(404, 'Task not found'));

    if (task.host.type === 'USER' && task.host.user?.id === userId) {
      return next();
    }


    if (task.host.type === 'ORGANIZATION' && task.host.organization?.id) {
      const membership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: task.host.organization.id,
          },
        },
      });

      if (membership && ['ADMIN', 'MODERATOR'].includes(membership.role)) {
        return next();
      }
    }

    logger.warn('Unauthorized attempt to modify task', { taskId, userId });
    return next(httpError(403, 'You do not have permission to perform this action'));
  } catch (error) {
    next(error);
  }
};
