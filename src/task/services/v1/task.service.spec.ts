import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CategoryType,
  EntityType,
  HostType,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { HostService } from 'src/host/services/host.service';
import { GeocodingService } from 'src/location/services/geocoding.service';
import { LocationService } from 'src/location/services/location.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { CreateTaskRequestV1, TaskRowV1 } from 'src/task/interfaces/task';
import { TaskMapperV1 } from 'src/task/mappers/v1/task.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';
import { TaskServiceV1 } from 'src/task/services/v1/task.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; it is reached through the notification service's
// realtime gateway, which these tests mock anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('TaskServiceV1', () => {
  const userId = 'user-id';
  const taskId = 'task-id';
  const taskRow: TaskRowV1 = {
    id: taskId,
    title: 'Clean park',
    description: 'Bring gloves',
    imageUrl: null,
    startDate: new Date('2026-10-01T09:00:00Z'),
    endDate: null,
    status: TaskStatus.PENDING,
    categories: [CategoryType.NATURE],
    amount: null,
    currentAmount: null,
    currency: null,
    requirements: null,
    rejectionReason: null,
    taskLocation: null,
    host: {
      type: HostType.USER,
      user: {
        id: userId,
        name: 'Ann',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
        userProfile: null,
      },
      organization: null,
    },
    participants: [],
  };
  const createRequest: CreateTaskRequestV1 = {
    title: 'Clean park',
    description: 'Bring gloves',
    isOrganization: false,
    startDate: '2026-10-01T09:00:00Z',
    startTime: '2026-10-01T09:00:00Z',
    categories: [CategoryType.NATURE],
  };
  const prisma = {
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskLocation: { updateMany: jest.fn() },
  };
  const organizationAccessService = { isOrganizationManager: jest.fn() };
  const taskGeoSearchService = { findTaskIdsWithinRadius: jest.fn() };
  const hostService = {
    createHostByUser: jest.fn(),
    createHostByOrganization: jest.fn(),
  };
  const locationService = { setTaskLocation: jest.fn() };
  const geocodingService = { reverseGeocodeCoordinates: jest.fn() };
  const notificationService = { createNotification: jest.fn() };
  let service: TaskServiceV1;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskServiceV1,
        TaskMapperV1,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OrganizationAccessService,
          useValue: organizationAccessService,
        },
        { provide: TaskGeoSearchService, useValue: taskGeoSearchService },
        { provide: HostService, useValue: hostService },
        { provide: LocationService, useValue: locationService },
        { provide: GeocodingService, useValue: geocodingService },
        { provide: NotificationServiceV2, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(TaskServiceV1);
  });

  describe('createTask', () => {
    it('should reject a duplicate found across every host', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: 'other-task-id' });

      await expect(service.createTask(createRequest, userId)).rejects.toThrow(
        V1ApiException,
      );
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          title: 'Clean park',
          startDate: new Date('2026-10-01T09:00:00Z'),
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(hostService.createHostByUser).not.toHaveBeenCalled();
    });

    it('should answer a duplicate with 409 and the legacy error code', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: 'other-task-id' });

      await expect(
        service.createTask(createRequest, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { code: ErrorCode.TASK_ALREADY_EXISTS },
      });
    });

    it('should not touch HostService when the user does not manage the organization', async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.createTask(
          {
            ...createRequest,
            isOrganization: true,
            organizationId: 'organization-id',
          },
          userId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { code: null },
      });
      expect(hostService.createHostByOrganization).not.toHaveBeenCalled();
    });

    it('should ignore startTime on write and answer with the created task', async () => {
      prisma.task.findFirst.mockResolvedValue(null);
      hostService.createHostByUser.mockResolvedValue({ id: 'host-id' });
      prisma.task.create.mockResolvedValue({ id: taskId });
      prisma.task.findMany.mockResolvedValue([taskRow]);

      const response = await service.createTask(createRequest, userId);

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ startTime: expect.anything() }),
        }),
      );
      expect(response.code).toBe(SuccessCode.TASK_CREATED);
      expect(response.data.task.id).toBe(taskId);
    });
  });

  describe('getAllTasks', () => {
    const pageQuery = (skip: number, take: number): object =>
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: [
          { createdAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.asc },
        ],
        skip,
        take,
      });

    it('should serve the first page of 12 tasks when no query is given', async () => {
      prisma.task.findMany.mockResolvedValue([taskRow]);
      prisma.task.count.mockResolvedValue(30);

      const response = await service.getAllTasks({});

      expect(prisma.task.findMany).toHaveBeenCalledWith(pageQuery(0, 12));
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(response).toMatchObject({
        status: 'success',
        code: SuccessCode.TASKS_RETRIEVED,
        data: { tasks: [expect.objectContaining({ id: taskId })] },
        pagination: {
          total: 30,
          page: 1,
          limit: 12,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      });
    });

    it('should skip the previous pages for the requested page and limit', async () => {
      prisma.task.findMany.mockResolvedValue([taskRow]);
      prisma.task.count.mockResolvedValue(30);

      const response = await service.getAllTasks({ page: '3', limit: '5' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(pageQuery(10, 5));
      expect(response.pagination).toMatchObject({
        page: 3,
        limit: 5,
        totalPages: 6,
      });
    });

    it('should fall back to the defaults for unparsable values', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.getAllTasks({ page: 'abc', limit: '' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(pageQuery(0, 12));
    });

    it('should clamp a negative page and limit instead of handing Prisma a negative skip', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      const response = await service.getAllTasks({ page: '-2', limit: '-5' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(pageQuery(0, 1));
      expect(response.pagination).toMatchObject({ page: 1, limit: 1 });
    });

    it('should cap the limit at 100', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.getAllTasks({ limit: '5000' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(pageQuery(0, 100));
    });

    it('should answer a page past the end with an empty list, not an error', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(3);

      const response = await service.getAllTasks({ page: '5' });

      expect(response.data.tasks).toEqual([]);
      expect(response.pagination).toMatchObject({
        total: 3,
        page: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('searchTasks', () => {
    it('should answer an empty result with 404 instead of an empty list', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await expect(
        service.searchTasks({ title: 'nothing' }, {}),
      ).rejects.toThrow(V1ApiException);
      await expect(
        service.searchTasks({ title: 'nothing' }, {}),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.TASK_SEARCH_EMPTY },
      });
    });

    it('should silently skip the radius filter when the radius is missing', async () => {
      prisma.task.findMany.mockResolvedValue([taskRow]);

      await service.searchTasks({ location: { lat: 50.45, lng: 30.52 } }, {});

      expect(
        taskGeoSearchService.findTaskIdsWithinRadius,
      ).not.toHaveBeenCalled();
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('should filter by the ids returned for the radius when both are given', async () => {
      taskGeoSearchService.findTaskIdsWithinRadius.mockResolvedValue([taskId]);
      prisma.task.findMany.mockResolvedValue([taskRow]);

      await service.searchTasks(
        {
          location: { lat: 50.45, lng: 30.52 },
          radiusKm: 5,
        },
        {},
      );

      expect(taskGeoSearchService.findTaskIdsWithinRadius).toHaveBeenCalledWith(
        {
          latitude: 50.45,
          longitude: 30.52,
          radiusKm: 5,
        },
      );
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, id: { in: [taskId] } },
        }),
      );
    });

    it('should paginate the matches and count them with the same filter', async () => {
      prisma.task.findMany.mockResolvedValue([taskRow]);
      prisma.task.count.mockResolvedValue(13);

      const response = await service.searchTasks(
        { title: 'park' },
        { page: '2' },
      );
      const where = {
        deletedAt: null,
        title: { contains: 'park', mode: Prisma.QueryMode.insensitive },
      };

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 12, take: 12 }),
      );
      expect(prisma.task.count).toHaveBeenCalledWith({ where });
      expect(response).toMatchObject({
        code: SuccessCode.TASKS_SEARCHED,
        pagination: {
          total: 13,
          page: 2,
          limit: 12,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });
    });

    it('should answer a page past the end of a non-empty search with an empty list, not 404', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(4);

      const response = await service.searchTasks(
        { title: 'park' },
        { page: '9' },
      );

      expect(response.data.tasks).toEqual([]);
      expect(response.pagination.total).toBe(4);
    });
  });

  describe('updateTaskStatus', () => {
    it('should notify every participant when the task is completed', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: taskId,
        title: 'Clean park',
        participants: [{ userId: 'participant-id' }],
      });
      prisma.task.update.mockResolvedValue({ id: taskId });
      prisma.task.findMany.mockResolvedValue([taskRow]);

      await service.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'participant-id',
        type: NotificationType.TASK_COMPLETED,
        relatedId: taskId,
        entityType: EntityType.TASK,
        params: { taskTitle: 'Clean park' },
      });
    });

    it('should not notify anybody for a status without a notification type', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: taskId,
        title: 'Clean park',
        participants: [{ userId: 'participant-id' }],
      });
      prisma.task.update.mockResolvedValue({ id: taskId });
      prisma.task.findMany.mockResolvedValue([taskRow]);

      await service.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should answer a missing task with 404', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaskStatus(taskId, TaskStatus.CLOSED),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.TASK_NOT_FOUND },
      });
    });
  });

  describe('deleteTask', () => {
    it('should hard delete the task and answer without a data key', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: taskId });

      const response = await service.deleteTask(taskId);

      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(response).toEqual({
        status: 'success',
        code: SuccessCode.TASK_DELETED,
      });
    });
  });
});
