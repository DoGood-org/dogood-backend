import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { Language } from 'src/i18n/i18n.constants';
import { I18nService } from 'src/i18n/services/i18n.service';
import {
  createNotificationSchemaV2,
  notificationContentSchemaV2,
} from 'src/notification/dtos/generic/v2/create-notification.dto';
import {
  CreateNotificationV2,
  GetMyNotificationsRequestV2,
  MarkAllMyNotificationsReadResultV2,
  NotificationTemplateParams,
  NotificationV2,
} from 'src/notification/interfaces/notification';

@Injectable()
export class NotificationServiceV2 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
  ) {}

  async createNotification(
    input: CreateNotificationV2,
  ): Promise<NotificationV2> {
    const { userId, type, params, metadata, relatedId, entityType } =
      createNotificationSchemaV2.parse(input);
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    });
    const language = this.i18nService.resolveLanguage(settings?.language);
    const { title, body } = notificationContentSchemaV2.parse({
      title: this.translateNotificationText(
        `notification.${type}.title`,
        language,
        params,
      ),
      body: this.translateNotificationText(
        `notification.${type}.body`,
        language,
        params,
      ),
    });

    return await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        relatedId,
        entityType,
        metadata: metadata ?? {},
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        relatedId: true,
        entityType: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async getMyNotifications(
    userId: string,
    query: GetMyNotificationsRequestV2,
  ): Promise<NotificationV2[]> {
    const { skip = 0, limit = 20 } = query;

    return await this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        relatedId: true,
        entityType: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    });
  }

  async markAllMyNotificationsRead(
    userId: string,
  ): Promise<MarkAllMyNotificationsReadResultV2> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null, deletedAt: null },
      data: { readAt: new Date() },
    });

    return { count };
  }

  async markMyNotificationRead(
    userId: string,
    id: string,
  ): Promise<NotificationV2> {
    return await this.updateMyNotification(userId, id, { readAt: new Date() });
  }

  async deleteMyNotification(userId: string, id: string): Promise<void> {
    await this.updateMyNotification(userId, id, { deletedAt: new Date() });
  }

  private translateNotificationText(
    key: string,
    language: Language,
    params?: NotificationTemplateParams,
  ): string {
    const text = this.i18nService.translate(key, language, params);

    if (text === key) {
      throw new Error(`Notification translation missing: ${key} (${language})`);
    }

    return text;
  }

  private async updateMyNotification(
    userId: string,
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<NotificationV2> {
    try {
      return await this.prisma.notification.update({
        where: { id, userId, deletedAt: null },
        data,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          relatedId: true,
          entityType: true,
          metadata: true,
          readAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Notification not found');
      }

      throw error;
    }
  }
}
