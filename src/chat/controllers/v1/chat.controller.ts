import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { User } from '@shared/decorators/user.decorator';
import { Response } from 'express';
import { ChatRoomParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-room-params-request.dto';
import { GetMyChatRoomsRequestDtoV1 } from 'src/chat/dtos/requests/v1/get-my-chat-rooms-request.dto';
import { OpenDirectChatRequestDtoV1 } from 'src/chat/dtos/requests/v1/open-direct-chat-request.dto';
import { ReorderPinnedChatRoomsRequestDtoV1 } from 'src/chat/dtos/requests/v1/reorder-pinned-chat-rooms-request.dto';
import { ChatGatewayV1 } from 'src/chat/gateways/v1/chat.gateway';
import {
  ChatMessagesDataV1,
  ChatPinnedRoomsResultV1,
  ChatResponseV1,
  ChatRoomDataV1,
  ChatRoomLeaveResultV1,
  ChatRoomsDataV1,
} from 'src/chat/interfaces/chat';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

@Controller({ path: 'chat', version: '1' })
export class ChatControllerV1 {
  constructor(
    private readonly chatService: ChatServiceV1,
    private readonly chatGateway: ChatGatewayV1,
  ) {}

  // NOTE: 201 when the chat is created, 200 when an existing one is opened (human's decision 2026-10-07).
  @Post('direct')
  async openDirectChat(
    @User('id') userId: string,
    @Body() dto: OpenDirectChatRequestDtoV1,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ChatResponseV1<ChatRoomDataV1>> {
    const { response, deliveries, isCreated } =
      await this.chatService.openDirectChat(userId, dto);

    if (isCreated) {
      res.status(HttpStatus.CREATED);
      this.chatGateway.emitChatRoomCreated(deliveries);
    } else {
      res.status(HttpStatus.OK);
    }

    return response;
  }

  @Get('room/:roomId')
  @HttpCode(HttpStatus.OK)
  async getChatRoom(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatRoomDataV1>> {
    return await this.chatService.getChatRoom(userId, params);
  }

  @Delete('quit/:roomId')
  @HttpCode(HttpStatus.OK)
  async leaveChatRoom(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatRoomLeaveResultV1>> {
    const { response, recipientIds } = await this.chatService.leaveChatRoom(
      userId,
      params,
    );

    this.chatGateway.emitUserLeftChatRoom(recipientIds, response.data);

    return response;
  }

  @Get('rooms')
  @HttpCode(HttpStatus.OK)
  async getMyChatRooms(
    @User('id') userId: string,
    @Query() params: GetMyChatRoomsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatRoomsDataV1>> {
    return await this.chatService.getMyChatRooms(userId, params);
  }

  @Get('messages/:roomId')
  @HttpCode(HttpStatus.OK)
  async getChatMessages(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatMessagesDataV1>> {
    return await this.chatService.getChatMessages(userId, params);
  }

  @Post('pin/:roomId')
  @HttpCode(HttpStatus.OK)
  async pinChatRoom(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    return await this.chatService.pinChatRoom(userId, params);
  }

  @Delete('pin/:roomId')
  @HttpCode(HttpStatus.OK)
  async unpinChatRoom(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    return await this.chatService.unpinChatRoom(userId, params);
  }

  @Patch('pins')
  @HttpCode(HttpStatus.OK)
  async reorderPinnedChatRooms(
    @User('id') userId: string,
    @Body() dto: ReorderPinnedChatRoomsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    return await this.chatService.reorderPinnedChatRooms(userId, dto);
  }
}
