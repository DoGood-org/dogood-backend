import { HttpStatus, Injectable } from '@nestjs/common';
import { EntityType, Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { HostService } from 'src/host/services/host.service';
import { GeocodingService } from 'src/location/services/geocoding.service';
import { LocationService } from 'src/location/services/location.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import {
  CreateTaskRequestV1,
  SearchTasksRequestV1,
  TASK_STATUS_NOTIFICATION_TYPES,
  TaskCoordinatesV1,
  TaskDeletedResponseV1,
  TaskResponseV1,
  TaskRowV1,
  TasksResponseV1,
  UpdateTaskRequestV1,
} from 'src/task/interfaces/task';
import { TaskMapperV1 } from 'src/task/mappers/v1/task.mapper';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';

@Injectable()
export class TaskServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskMapper: TaskMapperV1,
    private readonly taskAccessService: TaskAccessService,
    private readonly taskGeoSearchService: TaskGeoSearchService,
    private readonly hostService: HostService,
    private readonly locationService: LocationService,
    private readonly geocodingService: GeocodingService,
    private readonly notificationService: NotificationServiceV2,
  ) {}

  async getAllTasks(): Promise<TasksResponseV1> {
    const rows = await this.findTaskRows({ deletedAt: null });

    return this.taskMapper.toTasksResponse(rows, SuccessCode.TASKS_RETRIEVED);
  }

  async getTaskById(taskId: string): Promise<TaskResponseV1> {
    const row = await this.findTaskRowOrThrow(taskId, 'Task not found');

    return this.taskMapper.toTaskResponse(row, SuccessCode.TASK_RETRIEVED);
  }

  async createTask(
    data: CreateTaskRequestV1,
    userId: string,
  ): Promise<TaskResponseV1> {
    const {
      title,
      description,
      picture,
      isOrganization,
      organizationId,
      startDate,
      endDate,
      location,
      locationName,
      amount,
      currentAmount,
      currency,
      requirements,
      categories,
    } = data;
    const duplicate = await this.prisma.task.findFirst({
      where: { title, startDate: new Date(startDate), deletedAt: null },
      select: { id: true },
    });

    if (duplicate) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        'Task with these parameters already exists',
        ErrorCode.TASK_ALREADY_EXISTS,
      );
    }

    const host = await this.createTaskHost(
      userId,
      isOrganization,
      organizationId,
    );
    const { id: taskId } = await this.prisma.task.create({
      data: {
        title,
        description,
        imageUrl: picture,
        hostId: host.id,
        startDate: new Date(startDate),
        endDate: endDate === undefined ? undefined : new Date(endDate),
        amount,
        currentAmount,
        currency,
        requirements,
        categories,
      },
      select: { id: true },
    });

    await this.saveTaskLocation(taskId, location, locationName);

    const row = await this.findTaskRowOrThrow(taskId, 'Task not found');

    return this.taskMapper.toTaskResponse(row, SuccessCode.TASK_CREATED);
  }

  async searchTasks(params: SearchTasksRequestV1): Promise<TasksResponseV1> {
    const { title, categories, locationName, location, radiusKm } = params;
    const where: Prisma.TaskWhereInput = { deletedAt: null };

    if (title) {
      where.title = { contains: title, mode: Prisma.QueryMode.insensitive };
    }

    if (categories && categories.length > 0) {
      where.categories = { hasSome: categories };
    }

    if (locationName) {
      where.taskLocation = {
        name: { contains: locationName, mode: Prisma.QueryMode.insensitive },
      };
    }

    // NOTE: legacy applies the radius filter only when both the point and the radius are given;
    // either one alone is silently ignored.
    if (location && radiusKm) {
      const taskIds = await this.taskGeoSearchService.findTaskIdsWithinRadius({
        latitude: location.lat,
        longitude: location.lng,
        radiusKm,
      });

      where.id = { in: taskIds };
    }

    const rows = await this.findTaskRows(where);

    if (rows.length === 0) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'No tasks found matching the search criteria',
        ErrorCode.TASK_SEARCH_EMPTY,
      );
    }

    return this.taskMapper.toTasksResponse(rows, SuccessCode.TASKS_SEARCHED);
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskRequestV1,
  ): Promise<TaskResponseV1> {
    const {
      title,
      description,
      picture,
      startDate,
      endDate,
      amount,
      currentAmount,
      currency,
      requirements,
      location,
      locationName,
      categories,
    } = data;

    await this.findTaskIdOrThrow(taskId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        imageUrl: picture,
        startDate: startDate === undefined ? undefined : new Date(startDate),
        endDate: endDate === undefined ? undefined : new Date(endDate),
        amount,
        currentAmount,
        currency,
        requirements,
        categories,
      },
      select: { id: true },
    });

    await this.saveTaskLocation(taskId, location, locationName);

    const row = await this.findTaskRowOrThrow(
      taskId,
      `Task with id ${taskId} not found`,
    );

    return this.taskMapper.toTaskResponse(row, SuccessCode.TASK_UPDATED);
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<TaskResponseV1> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true,
        participants: {
          where: { deletedAt: null },
          select: { userId: true },
        },
      },
    });

    if (!task) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        `Task with id ${taskId} not found`,
        ErrorCode.TASK_NOT_FOUND,
      );
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { status },
      select: { id: true },
    });

    await this.notifyParticipants(
      taskId,
      task.title,
      status,
      task.participants.map((participant) => participant.userId),
    );

    const row = await this.findTaskRowOrThrow(
      taskId,
      `Task with id ${taskId} not found`,
    );

    return this.taskMapper.toTaskResponse(row, SuccessCode.TASK_STATUS_UPDATED);
  }

  async deleteTask(taskId: string): Promise<TaskDeletedResponseV1> {
    await this.findTaskIdOrThrow(taskId);

    // NOTE: v1 keeps the legacy hard delete; only v2 soft-deletes.
    await this.prisma.task.delete({ where: { id: taskId } });

    return this.taskMapper.toTaskDeletedResponse(SuccessCode.TASK_DELETED);
  }

  private async createTaskHost(
    userId: string,
    isOrganization: boolean,
    organizationId?: string,
  ): Promise<{ id: string }> {
    if (!isOrganization) {
      return await this.hostService.createHostByUser(userId);
    }

    if (!organizationId) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Organization ID is required when isOrganization is true',
        ErrorCode.TASK_NOT_FOUND,
        {
          status: 'error',
          statusCode: HttpStatus.BAD_REQUEST,
          code: null,
          message: 'Organization ID is required when isOrganization is true',
        },
      );
    }

    const isManager = await this.taskAccessService.isOrganizationManager(
      userId,
      organizationId,
    );

    if (!isManager) {
      // NOTE: legacy 403 bodies carry no machine-readable code, so the payload is spelled out here
      // instead of the default V1ApiException envelope.
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'You do not have permission to perform this action',
        ErrorCode.TASK_NOT_FOUND,
        {
          status: 'error',
          statusCode: HttpStatus.FORBIDDEN,
          code: null,
          message: 'You do not have permission to perform this action',
        },
      );
    }

    return await this.hostService.createHostByOrganization(organizationId);
  }

  private async saveTaskLocation(
    taskId: string,
    location?: TaskCoordinatesV1,
    locationName?: string,
  ): Promise<void> {
    if (!location) {
      if (locationName !== undefined) {
        await this.prisma.taskLocation.updateMany({
          where: { taskId },
          data: { name: locationName },
        });
      }

      return;
    }

    const address = await this.geocodingService.reverseGeocodeCoordinates(
      location.lat,
      location.lng,
    );

    if (address === null) {
      return;
    }

    const { country, region, city } = address;

    await this.locationService.setTaskLocation(taskId, {
      country,
      region,
      city,
      name: locationName ?? null,
      latitude: location.lat,
      longitude: location.lng,
    });
  }

  private async notifyParticipants(
    taskId: string,
    taskTitle: string,
    status: TaskStatus,
    participantIds: string[],
  ): Promise<void> {
    const type = TASK_STATUS_NOTIFICATION_TYPES[status];

    if (type === undefined || participantIds.length === 0) {
      return;
    }

    await Promise.all(
      participantIds.map((userId) =>
        this.notificationService.createNotification({
          userId,
          type,
          relatedId: taskId,
          entityType: EntityType.TASK,
          params: { taskTitle },
        }),
      ),
    );
  }

  private async findTaskIdOrThrow(taskId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true },
    });

    if (!task) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Task not found',
        ErrorCode.TASK_NOT_FOUND,
      );
    }
  }

  private async findTaskRowOrThrow(
    taskId: string,
    message: string,
  ): Promise<TaskRowV1> {
    const rows = await this.findTaskRows({ id: taskId, deletedAt: null });

    if (rows.length === 0) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        message,
        ErrorCode.TASK_NOT_FOUND,
      );
    }

    return rows[0];
  }

  private async findTaskRows(
    where: Prisma.TaskWhereInput,
  ): Promise<TaskRowV1[]> {
    return await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        startDate: true,
        endDate: true,
        status: true,
        categories: true,
        amount: true,
        currentAmount: true,
        currency: true,
        requirements: true,
        taskLocation: {
          select: { name: true, latitude: true, longitude: true },
        },
        host: {
          select: {
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                userProfile: { select: { avatar: true } },
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        },
        participants: {
          where: { deletedAt: null },
          select: { user: { select: { id: true, name: true } } },
        },
      },
    });
  }
}
