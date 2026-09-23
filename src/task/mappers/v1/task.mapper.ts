import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  TaskDeletedResponseV1,
  TaskHostV1,
  TaskResponseV1,
  TaskRowV1,
  TasksResponseV1,
  TaskV1,
} from 'src/task/interfaces/task';

@Injectable()
export class TaskMapperV1 {
  toTask(row: TaskRowV1): TaskV1 {
    const {
      id,
      title,
      description,
      imageUrl,
      startDate,
      endDate,
      status,
      categories,
      amount,
      currentAmount,
      currency,
      requirements,
      taskLocation,
      host,
      participants,
    } = row;
    const latitude = taskLocation?.latitude ?? null;
    const longitude = taskLocation?.longitude ?? null;

    return {
      id,
      title,
      description,
      picture: imageUrl,
      startDate,
      endDate,
      location:
        latitude === null || longitude === null
          ? null
          : { lat: latitude, lng: longitude },
      locationName: taskLocation?.name ?? null,
      amount,
      currentAmount,
      currency,
      requirements,
      status,
      categories,
      host: this.toTaskHost(host),
      joinedUsers: participants.map((participant) => ({
        id: participant.user.id,
        name: participant.user.name,
      })),
    };
  }

  toTaskResponse(row: TaskRowV1, code: SuccessCode): TaskResponseV1 {
    return { status: 'success', code, data: { task: this.toTask(row) } };
  }

  toTasksResponse(rows: TaskRowV1[], code: SuccessCode): TasksResponseV1 {
    return {
      status: 'success',
      code,
      data: { tasks: rows.map((row) => this.toTask(row)) },
    };
  }

  toTaskDeletedResponse(code: SuccessCode): TaskDeletedResponseV1 {
    return { status: 'success', code };
  }

  private toTaskHost(host: TaskRowV1['host']): TaskHostV1 {
    const { type, user, organization } = host;

    return {
      type,
      user:
        user === null
          ? null
          : {
              id: user.id,
              name: user.name,
              avatar: user.userProfile?.avatar ?? null,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
      organization:
        organization === null
          ? null
          : {
              id: organization.id,
              name: organization.name,
              avatar: organization.avatarUrl,
              createdAt: organization.createdAt,
            },
    };
  }
}
