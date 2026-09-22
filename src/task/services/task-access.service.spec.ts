import { Test } from '@nestjs/testing';
import {
  HostType,
  MembershipStatus,
  OrganizationRole,
  SiteRole,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  TaskModifyAccessResult,
  TaskStatusAccessResult,
} from 'src/task/interfaces/task';
import { TaskAccessService } from 'src/task/services/task-access.service';

describe('TaskAccessService', () => {
  const userId = 'user-id';
  const taskId = 'task-id';
  const organizationId = 'organization-id';
  const prisma = {
    task: { findFirst: jest.fn() },
    userOrganization: { findFirst: jest.fn() },
  };
  let service: TaskAccessService;

  const mockUserHostedTask = (): void => {
    prisma.task.findFirst.mockResolvedValue({
      hostId: 'host-id',
      host: { type: HostType.USER, userId, organizationId: null },
    });
  };
  const mockOrganizationHostedTask = (): void => {
    prisma.task.findFirst.mockResolvedValue({
      hostId: 'host-id',
      host: { type: HostType.ORGANIZATION, userId: null, organizationId },
    });
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TaskAccessService);
  });

  describe('isOrganizationManager', () => {
    it('should require an active admin or moderator membership', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue({ id: 'm-id' });

      await expect(
        service.isOrganizationManager(userId, organizationId),
      ).resolves.toBe(true);
      expect(prisma.userOrganization.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          organizationId,
          status: MembershipStatus.ACTIVE,
          role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should reject a member whose membership row is gone', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.isOrganizationManager(userId, organizationId),
      ).resolves.toBe(false);
    });
  });

  describe('checkTaskModifyAccess', () => {
    it('should let a site admin through without reading the task', async () => {
      await expect(
        service.checkTaskModifyAccess(userId, SiteRole.ADMIN, taskId),
      ).resolves.toBe(TaskModifyAccessResult.ALLOWED);
      expect(prisma.task.findFirst).not.toHaveBeenCalled();
    });

    it('should report a missing task', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.checkTaskModifyAccess(userId, SiteRole.USER, taskId),
      ).resolves.toBe(TaskModifyAccessResult.TASK_NOT_FOUND);
    });

    it('should allow the hosting user', async () => {
      mockUserHostedTask();

      await expect(
        service.checkTaskModifyAccess(userId, SiteRole.USER, taskId),
      ).resolves.toBe(TaskModifyAccessResult.ALLOWED);
    });

    it('should reject a removed organization moderator', async () => {
      mockOrganizationHostedTask();
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.checkTaskModifyAccess(userId, SiteRole.USER, taskId),
      ).resolves.toBe(TaskModifyAccessResult.NOT_AUTHORIZED);
    });
  });

  describe('checkTaskStatusAccess', () => {
    it('should let a site admin set any status', async () => {
      mockUserHostedTask();

      await expect(
        service.checkTaskStatusAccess(
          'admin-id',
          SiteRole.ADMIN,
          taskId,
          TaskStatus.IN_PROGRESS,
        ),
      ).resolves.toBe(TaskStatusAccessResult.ALLOWED);
    });

    it('should report a missing task before checking the site role', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.checkTaskStatusAccess(
          'admin-id',
          SiteRole.ADMIN,
          taskId,
          TaskStatus.CLOSED,
        ),
      ).resolves.toBe(TaskStatusAccessResult.TASK_NOT_FOUND);
    });

    it('should let the hosting user close the task', async () => {
      mockUserHostedTask();

      await expect(
        service.checkTaskStatusAccess(
          userId,
          SiteRole.USER,
          taskId,
          TaskStatus.CLOSED,
        ),
      ).resolves.toBe(TaskStatusAccessResult.ALLOWED);
    });

    it('should reject any other status from the hosting user', async () => {
      mockUserHostedTask();

      await expect(
        service.checkTaskStatusAccess(
          userId,
          SiteRole.USER,
          taskId,
          TaskStatus.IN_PROGRESS,
        ),
      ).resolves.toBe(TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN);
    });

    it('should reject an invalid status value before it is validated', async () => {
      mockUserHostedTask();

      await expect(
        service.checkTaskStatusAccess(
          userId,
          SiteRole.USER,
          taskId,
          'NONSENSE',
        ),
      ).resolves.toBe(TaskStatusAccessResult.HOST_USER_STATUS_FORBIDDEN);
    });

    it('should reject any other status from an organization manager', async () => {
      mockOrganizationHostedTask();
      prisma.userOrganization.findFirst.mockResolvedValue({ id: 'm-id' });

      await expect(
        service.checkTaskStatusAccess(
          userId,
          SiteRole.USER,
          taskId,
          TaskStatus.REJECTED,
        ),
      ).resolves.toBe(TaskStatusAccessResult.ORGANIZATION_STATUS_FORBIDDEN);
    });

    it('should reject a user who is neither host nor manager', async () => {
      mockOrganizationHostedTask();
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.checkTaskStatusAccess(
          userId,
          SiteRole.USER,
          taskId,
          TaskStatus.CLOSED,
        ),
      ).resolves.toBe(TaskStatusAccessResult.NOT_AUTHORIZED);
    });
  });
});
