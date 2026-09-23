import { Test } from '@nestjs/testing';
import {
  CategoryType,
  HostType,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HostService } from 'src/host/services/host.service';
import { GeocodingService } from 'src/location/services/geocoding.service';
import { LocationService } from 'src/location/services/location.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { CreateTaskRequestV2, TaskRowV2 } from 'src/task/interfaces/task';
import { TaskMapperV2 } from 'src/task/mappers/v2/task.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';
import { TaskServiceV2 } from 'src/task/services/v2/task.service';

describe('TaskServiceV2', () => {
  const userId = 'user-id';
  const taskId = 'task-id';
  const taskRow: TaskRowV2 = {
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
    createdAt: new Date('2026-09-01T10:00:00Z'),
    taskLocation: null,
    host: {
      id: 'host-id',
      type: HostType.USER,
      user: { name: 'Ann', userProfile: null },
      organization: null,
    },
  };
  const createRequest: CreateTaskRequestV2 = {
    title: 'Clean park',
    description: 'Bring gloves',
    isOrganization: false,
    startDate: '2026-10-01T09:00:00Z',
    categories: [CategoryType.NATURE],
  };
  const prisma = {
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    taskParticipant: { findMany: jest.fn() },
    taskLocation: { updateMany: jest.fn() },
  };
  const organizationAccessService = { isOrganizationManager: jest.fn() };
  const taskGeoSearchService = { findTaskIdsWithinRadius: jest.fn() };
  const hostService = {
    createHostByUser: jest.fn(),
    createHostByOrganization: jest.fn(),
  };
  const locationService = {
    setTaskLocation: jest.fn(),
    deleteTaskLocation: jest.fn(),
  };
  const geocodingService = { reverseGeocodeCoordinates: jest.fn() };
  const notificationService = { createNotification: jest.fn() };
  const notFoundError = new Prisma.PrismaClientKnownRequestError('not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
  let service: TaskServiceV2;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskServiceV2,
        TaskMapperV2,
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

    service = moduleRef.get(TaskServiceV2);
  });

  describe('getTasks', () => {
    it('should page with the default sort and a unique tiebreaker', async () => {
      prisma.task.findMany.mockResolvedValue([taskRow]);

      const tasks = await service.getTasks({});

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: 0,
          take: 20,
        }),
      );
      expect(tasks).toHaveLength(1);
    });

    it('should answer an empty result with an empty list', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await expect(service.getTasks({ search: 'nothing' })).resolves.toEqual(
        [],
      );
    });

    it('should skip the radius filter when only the coordinates are given', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.getTasks({ latitude: 50.45, longitude: 30.52 });

      expect(
        taskGeoSearchService.findTaskIdsWithinRadius,
      ).not.toHaveBeenCalled();
    });

    it('should filter by the ids of the radius search when both are given', async () => {
      taskGeoSearchService.findTaskIdsWithinRadius.mockResolvedValue([taskId]);
      prisma.task.findMany.mockResolvedValue([taskRow]);

      await service.getTasks({
        latitude: 50.45,
        longitude: 30.52,
        radiusKm: 5,
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, id: { in: [taskId] } },
        }),
      );
    });
  });

  describe('getTaskParticipants', () => {
    it('should not spend a second query when the page is not empty', async () => {
      prisma.taskParticipant.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-09-05T10:00:00Z'),
          user: { id: 'participant-id', name: 'Bob', userProfile: null },
        },
      ]);

      await service.getTaskParticipants(taskId, {});

      expect(prisma.task.findFirst).not.toHaveBeenCalled();
    });

    it('should answer a missing task with 404 when the page is empty', async () => {
      prisma.taskParticipant.findMany.mockResolvedValue([]);
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.getTaskParticipants(taskId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should answer an existing task without participants with an empty list', async () => {
      prisma.taskParticipant.findMany.mockResolvedValue([]);
      prisma.task.findFirst.mockResolvedValue({ id: taskId });

      await expect(service.getTaskParticipants(taskId, {})).resolves.toEqual(
        [],
      );
    });
  });

  describe('createTask', () => {
    it('should look for a duplicate within the host only', async () => {
      hostService.createHostByUser.mockResolvedValue({ id: 'host-id' });
      prisma.task.findFirst.mockResolvedValueOnce({ id: 'other-task-id' });

      await expect(service.createTask(createRequest, userId)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          hostId: 'host-id',
          title: 'Clean park',
          startDate: new Date('2026-10-01T09:00:00Z'),
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should create the task when no duplicate belongs to the host', async () => {
      hostService.createHostByUser.mockResolvedValue({ id: 'host-id' });
      prisma.task.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(taskRow);
      prisma.task.create.mockResolvedValue({ id: taskId });

      const task = await service.createTask(createRequest, userId);

      expect(task.id).toBe(taskId);
    });
  });

  describe('updateTaskStatus', () => {
    it('should notify the participants of a completed task', async () => {
      prisma.task.update.mockResolvedValue(taskRow);
      prisma.taskParticipant.findMany.mockResolvedValue([
        { userId: 'participant-id' },
      ]);

      await service.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'participant-id',
          type: NotificationType.TASK_COMPLETED,
          params: { taskTitle: 'Clean park' },
        }),
      );
    });

    it('should answer a missing task with 404', async () => {
      prisma.task.update.mockRejectedValue(notFoundError);

      await expect(
        service.updateTaskStatus(taskId, TaskStatus.CLOSED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTask', () => {
    it('should soft delete the task instead of removing the row', async () => {
      prisma.task.update.mockResolvedValue(taskRow);

      await service.deleteTask(taskId);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('updateTask', () => {
    it('should clear the task location when both coordinates are null', async () => {
      prisma.task.update.mockResolvedValue(taskRow);

      await service.updateTask(taskId, { latitude: null, longitude: null });

      expect(locationService.deleteTaskLocation).toHaveBeenCalledWith(taskId);
      expect(locationService.setTaskLocation).not.toHaveBeenCalled();
    });

    it('should rename an existing location when only the name changes', async () => {
      prisma.task.update.mockResolvedValue(taskRow);

      await service.updateTask(taskId, { locationName: 'New park' });

      expect(prisma.taskLocation.updateMany).toHaveBeenCalledWith({
        where: { taskId },
        data: { name: 'New park' },
      });
      expect(geocodingService.reverseGeocodeCoordinates).not.toHaveBeenCalled();
    });
  });
});
