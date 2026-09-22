import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType, Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { HostService } from 'src/host/services/host.service';
import { GeocodingService } from 'src/location/services/geocoding.service';
import { LocationService } from 'src/location/services/location.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import {
  CreateTaskRequestV2,
  GetTaskParticipantsRequestV2,
  GetTasksRequestV2,
  TASK_STATUS_NOTIFICATION_TYPES,
  TaskParticipantV2,
  TaskRowV2,
  TaskSortFieldV2,
  TaskV2,
  UpdateTaskRequestV2,
} from 'src/task/interfaces/task';
import { TaskMapperV2 } from 'src/task/mappers/v2/task.mapper';
import { TaskAccessService } from 'src/task/services/task-access.service';
import { TaskGeoSearchService } from 'src/task/services/task-geo-search.service';

@Injectable()
export class TaskServiceV2 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskMapper: TaskMapperV2,
    private readonly taskAccessService: TaskAccessService,
    private readonly taskGeoSearchService: TaskGeoSearchService,
    private readonly hostService: HostService,
    private readonly locationService: LocationService,
    private readonly geocodingService: GeocodingService,
    private readonly notificationService: NotificationServiceV2,
  ) {}

  async getTasks(params: GetTasksRequestV2): Promise<TaskV2[]> {
    const {
      search,
      categories,
      locationName,
      latitude,
      longitude,
      radiusKm,
      sort = TaskSortFieldV2.CREATED_AT,
      sortDirection = Prisma.SortOrder.desc,
      skip = 0,
      limit = 20,
    } = params;
    const where: Prisma.TaskWhereInput = { deletedAt: null };

    if (search) {
      where.title = { contains: search, mode: Prisma.QueryMode.insensitive };
    }

    if (categories && categories.length > 0) {
      where.categories = { hasSome: categories };
    }

    if (locationName) {
      where.taskLocation = {
        name: { contains: locationName, mode: Prisma.QueryMode.insensitive },
      };
    }

    // NOTE: the radius filter needs both the point and the radius; either one alone is ignored,
    // as in v1.
    if (latitude !== undefined && longitude !== undefined && radiusKm) {
      const taskIds = await this.taskGeoSearchService.findTaskIdsWithinRadius({
        latitude,
        longitude,
        radiusKm,
      });

      where.id = { in: taskIds };
    }

    const rows = await this.prisma.task.findMany({
      where,
      orderBy: [{ [sort]: sortDirection }, { id: Prisma.SortOrder.asc }],
      skip,
      take: limit,
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
        createdAt: true,
        taskLocation: {
          select: { name: true, latitude: true, longitude: true },
        },
        host: {
          select: {
            id: true,
            type: true,
            user: {
              select: { name: true, userProfile: { select: { avatar: true } } },
            },
            organization: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    return this.taskMapper.toTasks(rows);
  }

  async getTaskById(taskId: string): Promise<TaskV2> {
    const row = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
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
        createdAt: true,
        taskLocation: {
          select: { name: true, latitude: true, longitude: true },
        },
        host: {
          select: {
            id: true,
            type: true,
            user: {
              select: { name: true, userProfile: { select: { avatar: true } } },
            },
            organization: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Task not found');
    }

    return this.taskMapper.toTask(row);
  }

  async getTaskParticipants(
    taskId: string,
    params: GetTaskParticipantsRequestV2,
  ): Promise<TaskParticipantV2[]> {
    const { skip = 0, limit = 20 } = params;
    const rows = await this.prisma.taskParticipant.findMany({
      where: { taskId, deletedAt: null, task: { deletedAt: null } },
      orderBy: [
        { createdAt: Prisma.SortOrder.asc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
      },
    });

    // NOTE: an empty page is ambiguous — only then is it worth a second query to tell "no
    // participants" from "no such task".
    if (rows.length === 0) {
      await this.findTaskIdOrThrow(taskId);
    }

    return this.taskMapper.toTaskParticipants(rows);
  }

  async createTask(data: CreateTaskRequestV2, userId: string): Promise<TaskV2> {
    const {
      title,
      description,
      imageUrl,
      isOrganization,
      organizationId,
      startDate,
      endDate,
      latitude,
      longitude,
      locationName,
      amount,
      currentAmount,
      currency,
      requirements,
      categories,
    } = data;
    const host = await this.createTaskHost(
      userId,
      isOrganization,
      organizationId,
    );
    const duplicate = await this.prisma.task.findFirst({
      where: {
        hostId: host.id,
        title,
        startDate: new Date(startDate),
        deletedAt: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'This host already has a task with the same title and start date',
      );
    }

    const { id: taskId } = await this.prisma.task.create({
      data: {
        title,
        description,
        imageUrl,
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

    await this.saveTaskLocation(taskId, latitude, longitude, locationName);

    return await this.getTaskById(taskId);
  }

  async updateTask(taskId: string, data: UpdateTaskRequestV2): Promise<TaskV2> {
    const {
      title,
      description,
      imageUrl,
      startDate,
      endDate,
      latitude,
      longitude,
      locationName,
      amount,
      currentAmount,
      currency,
      requirements,
      categories,
    } = data;

    // NOTE: the location is written first so that the task row returned by the update below is
    // already the final one — no second read.
    if (latitude === null && longitude === null) {
      await this.locationService.deleteTaskLocation(taskId);
    } else {
      await this.saveTaskLocation(
        taskId,
        latitude ?? undefined,
        longitude ?? undefined,
        locationName,
      );
    }

    const row = await this.updateTaskOrThrow(taskId, {
      title,
      description,
      imageUrl,
      startDate: startDate === undefined ? undefined : new Date(startDate),
      endDate: endDate === undefined ? undefined : new Date(endDate),
      amount,
      currentAmount,
      currency,
      requirements,
      categories,
    });

    return this.taskMapper.toTask(row);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskV2> {
    const row = await this.updateTaskOrThrow(taskId, { status });
    const participants = await this.prisma.taskParticipant.findMany({
      where: { taskId, deletedAt: null },
      select: { userId: true },
    });

    await this.notifyParticipants(
      taskId,
      row.title,
      status,
      participants.map((participant) => participant.userId),
    );

    return this.taskMapper.toTask(row);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.updateTaskOrThrow(taskId, { deletedAt: new Date() });
  }

  private async createTaskHost(
    userId: string,
    isOrganization: boolean,
    organizationId?: string,
  ): Promise<{ id: string }> {
    if (!isOrganization || organizationId === undefined) {
      return await this.hostService.createHostByUser(userId);
    }

    const isManager = await this.taskAccessService.isOrganizationManager(
      userId,
      organizationId,
    );

    if (!isManager) {
      throw new ForbiddenException(
        'You are not an active admin or moderator of this organization',
      );
    }

    return await this.hostService.createHostByOrganization(organizationId);
  }

  private async saveTaskLocation(
    taskId: string,
    latitude?: number,
    longitude?: number,
    locationName?: string,
  ): Promise<void> {
    if (latitude === undefined || longitude === undefined) {
      if (locationName !== undefined) {
        await this.prisma.taskLocation.updateMany({
          where: { taskId },
          data: { name: locationName },
        });
      }

      return;
    }

    const address = await this.geocodingService.reverseGeocodeCoordinates(
      latitude,
      longitude,
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
      latitude,
      longitude,
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
      throw new NotFoundException('Task not found');
    }
  }

  private async updateTaskOrThrow(
    taskId: string,
    data: Prisma.TaskUpdateInput,
  ): Promise<TaskRowV2> {
    try {
      return await this.prisma.task.update({
        where: { id: taskId, deletedAt: null },
        data,
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
          createdAt: true,
          taskLocation: {
            select: { name: true, latitude: true, longitude: true },
          },
          host: {
            select: {
              id: true,
              type: true,
              user: {
                select: {
                  name: true,
                  userProfile: { select: { avatar: true } },
                },
              },
              organization: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Task not found');
      }

      throw error;
    }
  }
}
