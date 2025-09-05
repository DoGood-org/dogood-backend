import { Request, Response, NextFunction } from 'express';
import { getTaskByIdService } from '@/services/task.service';
import logger from '@/utils/logger';
import { httpError } from '@/helpers/httpError';

/**
 * Middleware to authorize actions on a task.
 * Checks if the user can modify or delete a task.
 */
export const authorizeTaskAction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taskId = Number(req.params.id);
    const user = req.user;

    if (!user) {
      logger.warn('Unauthorized attempt to modify task - no user in request');
      return next(httpError(401, 'Authentication required'));
    }

    const task = await getTaskByIdService(taskId);
    if (!task) {
      return next(httpError(404, 'Task not found'));
    }

    // Global site admin can always modify
    if (user.siteRole === 'ADMIN') {
      return next();
    }

    // Host is a user
    if (task.host.user) {
      if (task.host.user.id !== user.id) {
        logger.warn('Unauthorized attempt to modify task', {
          taskId,
          userId: user.id,
        });
        return next(
          httpError(403, 'You do not have permission to perform this action')
        );
      }
      return next();
    }

    // Host is an organization
    if (task.host.organization) {
      const orgRole = user.organizations?.find(
        (o) => o.id === task.host.organization!.id
      )?.role;
      if (!['ADMIN', 'MODERATOR'].includes(orgRole || '')) {
        logger.warn('Unauthorized attempt to modify organization task', {
          taskId,
          userId: user.id,
        });
        return next(
          httpError(403, 'You do not have permission to perform this action')
        );
      }
      return next();
    }

    // Fallback deny
    logger.warn('Unauthorized attempt to modify task - no valid host', {
      taskId,
      userId: user.id,
    });
    return next(
      httpError(403, 'You do not have permission to perform this action')
    );
  } catch (error) {
    next(error);
  }
};
