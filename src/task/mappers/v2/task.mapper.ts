import { Injectable } from '@nestjs/common';
import {
  TaskHostV2,
  TaskParticipantRowV2,
  TaskParticipantV2,
  TaskRowV2,
  TaskV2,
} from 'src/task/interfaces/task';

@Injectable()
export class TaskMapperV2 {
  toTask(row: TaskRowV2): TaskV2 {
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
      createdAt,
      taskLocation,
      host,
    } = row;

    return {
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
      locationName: taskLocation?.name ?? null,
      latitude: taskLocation?.latitude ?? null,
      longitude: taskLocation?.longitude ?? null,
      host: this.toTaskHost(host),
      createdAt,
    };
  }

  toTasks(rows: TaskRowV2[]): TaskV2[] {
    return rows.map((row) => this.toTask(row));
  }

  toTaskParticipants(rows: TaskParticipantRowV2[]): TaskParticipantV2[] {
    return rows.map((row) => ({
      id: row.user.id,
      name: row.user.name,
      avatar: row.user.userProfile?.avatar ?? null,
      joinedAt: row.createdAt,
    }));
  }

  private toTaskHost(host: TaskRowV2['host']): TaskHostV2 {
    const { id, type, user, organization } = host;

    return {
      id,
      type,
      name: user?.name ?? organization?.name ?? null,
      avatar: user?.userProfile?.avatar ?? organization?.avatarUrl ?? null,
    };
  }
}
