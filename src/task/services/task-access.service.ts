import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  OrganizationRole,
  SiteRole,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  TaskHostAccess,
  TaskModifyAccessResult,
  TaskStatusAccessResult,
} from 'src/task/interfaces/task';

const HOST_ALLOWED_STATUSES: TaskStatus[] = [
  TaskStatus.CLOSED,
  TaskStatus.COMPLETED,
];

@Injectable()
export class TaskAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaskHost(taskId: string): Promise<TaskHostAccess | null> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        hostId: true,
        host: { select: { type: true, userId: true, organizationId: true } },
      },
    });

    if (!task) {
      return null;
    }

    const { hostId, host } = task;

    return {
      hostId,
      type: host.type,
      userId: host.userId,
      organizationId: host.organizationId,
    };
  }

  async isOrganizationManager(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
        deletedAt: null,
      },
      select: { id: true },
    });

    return membership !== null;
  }

  // NOTE: the site admin short-circuit runs before the task lookup, exactly like the legacy
  // authorizeTaskUpdate middleware — a missing task is answered by the handler, not by the guard.
  async checkTaskModifyAccess(
    userId: string,
    siteRole: string,
    taskId: string,
  ): Promise<TaskModifyAccessResult> {
    if (siteRole === SiteRole.ADMIN) {
      return TaskModifyAccessResult.ALLOWED;
    }

    const host = await this.getTaskHost(taskId);

    if (host === null) {
      return TaskModifyAccessResult.TASK_NOT_FOUND;
    }

    if (await this.isTaskHost(userId, host)) {
      return TaskModifyAccessResult.ALLOWED;
    }

    return TaskModifyAccessResult.NOT_AUTHORIZED;
  }

  async checkTaskStatusAccess(
    userId: string,
    siteRole: string,
    taskId: string,
    status: unknown,
  ): Promise<TaskStatusAccessResult> {
    const host = await this.getTaskHost(taskId);

    if (host === null) {
      return TaskStatusAccessResult.TASK_NOT_FOUND;
    }

    if (siteRole === SiteRole.ADMIN) {
      return TaskStatusAccessResult.ALLOWED;
    }

    const isStatusAllowed = HOST_ALLOWED_STATUSES.some(
      (allowedStatus) => allowedStatus === status,
    );

    if (host.userId !== null && host.userId === userId) {
      if (isStatusAllowed) {
        return TaskStatusAccessResult.ALLOWED;
      }

      return TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN;
    }

    if (
      host.organizationId !== null &&
      (await this.isOrganizationManager(userId, host.organizationId))
    ) {
      if (isStatusAllowed) {
        return TaskStatusAccessResult.ALLOWED;
      }

      return TaskStatusAccessResult.ORGANIZATION_STATUS_FORBIDDEN;
    }

    return TaskStatusAccessResult.NOT_AUTHORIZED;
  }

  private async isTaskHost(
    userId: string,
    host: TaskHostAccess,
  ): Promise<boolean> {
    if (host.userId !== null) {
      return host.userId === userId;
    }

    if (host.organizationId !== null) {
      return await this.isOrganizationManager(userId, host.organizationId);
    }

    return false;
  }
}
