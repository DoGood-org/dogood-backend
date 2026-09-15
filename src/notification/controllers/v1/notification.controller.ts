import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { User } from '@shared/decorators/user.decorator';
import { GetMyNotificationsRequestDtoV1 } from 'src/notification/dtos/requests/v1/get-my-notifications-request.dto';
import {
  MyNotificationsResponseV1,
  NotificationMessageResponseV1,
  NotificationResponseV1,
} from 'src/notification/interfaces/notification';
import { NotificationServiceV1 } from 'src/notification/services/v1/notification.service';

@Controller({ path: 'notifications', version: '1' })
export class NotificationControllerV1 {
  constructor(private readonly notificationService: NotificationServiceV1) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyNotifications(
    @User('id') userId: string,
    @Query() query: GetMyNotificationsRequestDtoV1,
  ): Promise<MyNotificationsResponseV1> {
    return await this.notificationService.getMyNotifications(userId, query);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllMyNotificationsRead(
    @User('id') userId: string,
  ): Promise<NotificationMessageResponseV1> {
    return await this.notificationService.markAllMyNotificationsRead(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markMyNotificationRead(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<NotificationResponseV1> {
    return await this.notificationService.markMyNotificationRead(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMyNotification(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<NotificationMessageResponseV1> {
    return await this.notificationService.deleteMyNotification(userId, id);
  }
}
