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
import { ApiOkResponse } from '@nestjs/swagger';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { User } from '@shared/decorators/user.decorator';
import { GetMyNotificationsRequestDtoV1 } from 'src/notification/dtos/requests/v1/get-my-notifications-request.dto';
import {
  MyNotificationsResponseV1,
  NotificationMessageResponseV1,
  NotificationResponseV1,
} from 'src/notification/interfaces/notification';
import { NotificationServiceV1 } from 'src/notification/services/v1/notification.service';
import { GetMyNotificationsResponseDtoV1 } from 'src/notification/dtos/responses/v1/get-my-notifications-response.dto';
import { NotificationMessageResponseDtoV1 } from 'src/notification/dtos/responses/v1/notification-message-response.dto';
import { NotificationResponseDtoV1 } from 'src/notification/dtos/responses/v1/notification-response.dto';

@AuthV1()
@Controller({ path: 'notifications', version: '1' })
export class NotificationControllerV1 {
  constructor(private readonly notificationService: NotificationServiceV1) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetMyNotificationsResponseDtoV1 })
  async getMyNotifications(
    @User('id') userId: string,
    @Query() query: GetMyNotificationsRequestDtoV1,
  ): Promise<MyNotificationsResponseV1> {
    return await this.notificationService.getMyNotifications(userId, query);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationMessageResponseDtoV1 })
  async markAllMyNotificationsRead(
    @User('id') userId: string,
  ): Promise<NotificationMessageResponseV1> {
    return await this.notificationService.markAllMyNotificationsRead(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationResponseDtoV1 })
  async markMyNotificationRead(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<NotificationResponseV1> {
    return await this.notificationService.markMyNotificationRead(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationMessageResponseDtoV1 })
  async deleteMyNotification(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<NotificationMessageResponseV1> {
    return await this.notificationService.deleteMyNotification(userId, id);
  }
}
