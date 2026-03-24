// middlewares/authorizeTaskStatusChange.ts
import { prisma } from '@/lib/prisma';
import { taskServices } from '@/services/task.service';

import logger from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';

export const authorizeTaskStatusChange = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const taskId = req.params.id;
    const { status } = req.body;

    if (!user) {
      logger.warn(
        'Unauthorized attempt to change task status - no user in request'
      );
      return res.status(401).json({ message: 'Authentication required' });
    }

    const task = await taskServices.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (user.siteRole === 'ADMIN') {
      return next();
    }

    const allowedStatuses = ['CLOSED', 'COMPLETED'];

    if (task.host.type === 'USER' && task.host.user?.id === user.id) {
      if (allowedStatuses.includes(status)) return next();
      logger.warn('Host user attempted unauthorized task status change', {
        userId: user.id,
        taskId,
        attemptedStatus: status,
      });
      return res
        .status(403)
        .json({ message: 'Host user can only close or complete the task' });
    }

    if (task.host.type === 'ORGANIZATION') {
      const membership = await prisma.userOrganization.findFirst({
        where: { userId: user.id, organizationId: task.host.organization?.id! },
      });

      if (membership && ['ADMIN', 'MODERATOR'].includes(membership.role)) {
        if (allowedStatuses.includes(status)) return next();
        logger.warn(
          'Organization admin/manager attempted unauthorized task status change',
          {
            userId: user.id,
            taskId,
            attemptedStatus: status,
          }
        );
        return res.status(403).json({
          message:
            'Organization admins/managers can only close or complete tasks',
        });
      }
    }

    logger.warn('User not authorized to change task status', {
      userId: user.id,
      taskId,
      attemptedStatus: status,
    });
    return res
      .status(403)
      .json({ message: 'Not authorized to change task status' });
  } catch (err) {
    logger.error('Error in authorizeTaskStatusChange middleware', { err });
    return res.status(500).json({ message: 'Server error' });
  }
};
