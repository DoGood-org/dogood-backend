import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CreateNotification } from 'src/notification/interfaces/create-notification';
import { NotificationV2 } from 'src/notification/interfaces/v2/notification-v2';

/**
 * Внутрішня точка створення сповіщень: доменні модулі імпортують NotificationModule
 * і викликають `create`. Сам сервіс не знає про доменні модулі — циклу немає.
 *
 * ponytail: `title`/`body` приходять уже перекладеними від викликача. Коли зʼявиться
 * перший доменний модуль — додати ключі `notification.<TYPE>.title|body` у три файли
 * перекладів і перекладати тут за `userSettings.language` отримувача.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: CreateNotification): Promise<NotificationV2> {
    const { userId, type, title, body, relatedId, entityType, metadata } = data;

    return this.prismaService.notification.create({
      data: { userId, type, title, body, relatedId, entityType, metadata },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        relatedId: true,
        entityType: true,
        metadata: true,
        createdAt: true,
      },
    });
  }
}
