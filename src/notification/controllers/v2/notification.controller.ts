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
import { ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { GetMyNotificationsRequestDtoV2 } from 'src/notification/dtos/requests/v2/get-my-notifications-request.dto';
import {
  MarkAllMyNotificationsReadResultV2,
  MyUnreadNotificationsCountV2,
  NotificationV2,
} from 'src/notification/interfaces/notification';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { GetMyNotificationsResponseDtoV2 } from 'src/notification/dtos/responses/v2/get-my-notifications-response.dto';
import { NotificationResponseDtoV2 } from 'src/notification/dtos/responses/v2/notification-response.dto';
import { NotificationsCountResponseDtoV2 } from 'src/notification/dtos/responses/v2/notifications-count-response.dto';

@Controller({ path: 'notifications', version: '2' })
export class NotificationControllerV2 {
  constructor(private readonly notificationService: NotificationServiceV2) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GetMyNotificationsResponseDtoV2 })
  async getMyNotifications(
    @User('id') userId: string,
    @Query() query: GetMyNotificationsRequestDtoV2,
  ): Promise<ResponseWrapper<NotificationV2[]>> {
    return new ResponseWrapper(
      await this.notificationService.getMyNotifications(userId, query),
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationsCountResponseDtoV2 })
  async getMyUnreadNotificationsCount(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<MyUnreadNotificationsCountV2>> {
    return new ResponseWrapper(
      await this.notificationService.getMyUnreadNotificationsCount(userId),
    );
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationsCountResponseDtoV2 })
  async markAllMyNotificationsRead(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<MarkAllMyNotificationsReadResultV2>> {
    return new ResponseWrapper(
      await this.notificationService.markAllMyNotificationsRead(userId),
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: NotificationResponseDtoV2 })
  async markMyNotificationRead(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<ResponseWrapper<NotificationV2>> {
    return new ResponseWrapper(
      await this.notificationService.markMyNotificationRead(userId, id),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deleteMyNotification(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.notificationService.deleteMyNotification(userId, id);
  }
}
