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
import { User } from '@shared/decorators/user.decorator';
import { ResponseWrapper } from '@shared/response/response.wrapper';
import { NotificationV2Service } from 'src/notification/services/v2/notification-v2.service';
import { GetNotificationsRequestV2Dto } from 'src/notification/dto/v2/requests';
import {
  GetNotificationsResponseV2Dto,
  MarkAllNotificationsReadResponseV2Dto,
} from 'src/notification/dto/v2/responses';

@Controller({ path: 'notifications', version: '2' })
export class NotificationV2Controller {
  constructor(private readonly notificationService: NotificationV2Service) {}

  @Get()
  async getNotifications(
    @User('id') userId: string,
    @Query() query: GetNotificationsRequestV2Dto,
  ): Promise<ResponseWrapper<GetNotificationsResponseV2Dto[]>> {
    const notifications = await this.notificationService.getNotifications(
      userId,
      query,
    );

    return new ResponseWrapper(notifications);
  }

  @Patch('read-all')
  async markAllNotificationsRead(
    @User('id') userId: string,
  ): Promise<ResponseWrapper<MarkAllNotificationsReadResponseV2Dto>> {
    const result =
      await this.notificationService.markAllNotificationsRead(userId);

    return new ResponseWrapper(result);
  }

  @Patch(':id/read')
  async markNotificationRead(
    @User('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseWrapper<GetNotificationsResponseV2Dto>> {
    const notification = await this.notificationService.markNotificationRead(
      userId,
      id,
    );

    return new ResponseWrapper(notification);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @User('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notificationService.deleteNotification(userId, id);
  }
}
