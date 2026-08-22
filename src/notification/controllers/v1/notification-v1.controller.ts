import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { User } from '@shared/decorators/user.decorator';
import { NotificationV1Service } from 'src/notification/services/v1/notification-v1.service';
import {
  GetNotificationsRequestV1Dto,
  getNotificationsV1Schema,
} from 'src/notification/dto/v1/requests';
import {
  DeleteNotificationResponseV1Dto,
  GetNotificationsResponseV1Dto,
  MarkAllNotificationsReadResponseV1Dto,
  MarkNotificationReadResponseV1Dto,
} from 'src/notification/dto/v1/responses';

/** Legacy-контракт: пласке тіло `{ status, ... }`, без ResponseWrapper і без `code`. */
@Controller({ path: 'notifications', version: '1' })
export class NotificationV1Controller {
  constructor(private readonly notificationService: NotificationV1Service) {}

  @Get()
  async getNotifications(
    @User('id') userId: string,
    @Query(new ZodValidationPipe(getNotificationsV1Schema))
    query: GetNotificationsRequestV1Dto,
  ): Promise<GetNotificationsResponseV1Dto> {
    const { data, pagination } =
      await this.notificationService.getNotifications(userId, query);

    return { status: 'success', data, pagination };
  }

  @Patch('read-all')
  async markAllNotificationsRead(
    @User('id') userId: string,
  ): Promise<MarkAllNotificationsReadResponseV1Dto> {
    await this.notificationService.markAllNotificationsRead(userId);

    return { status: 'success', message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  async markNotificationRead(
    @User('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MarkNotificationReadResponseV1Dto> {
    const notification = await this.notificationService.markNotificationRead(
      userId,
      id,
    );

    return { status: 'success', data: notification };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @User('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeleteNotificationResponseV1Dto> {
    await this.notificationService.deleteNotification(userId, id);

    return { status: 'success' };
  }
}
