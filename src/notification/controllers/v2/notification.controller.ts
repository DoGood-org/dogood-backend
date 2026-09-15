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
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { GetMyNotificationsRequestDtoV2 } from 'src/notification/dtos/requests/v2/get-my-notifications-request.dto';
import {
  MarkAllMyNotificationsReadResultV2,
  MyUnreadNotificationsCountV2,
  NotificationV2,
} from 'src/notification/interfaces/notification';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';

@Controller({ path: 'notifications', version: '2' })
export class NotificationControllerV2 {
  constructor(private readonly notificationService: NotificationServiceV2) {}

  @Get()
  @HttpCode(HttpStatus.OK)
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
  async getMyUnreadNotificationsCount(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<MyUnreadNotificationsCountV2>> {
    return new ResponseWrapper(
      await this.notificationService.getMyUnreadNotificationsCount(userId),
    );
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllMyNotificationsRead(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<MarkAllMyNotificationsReadResultV2>> {
    return new ResponseWrapper(
      await this.notificationService.markAllMyNotificationsRead(userId),
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
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
  async deleteMyNotification(
    @User('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.notificationService.deleteMyNotification(userId, id);
  }
}
