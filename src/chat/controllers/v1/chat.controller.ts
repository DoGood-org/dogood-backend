import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { User } from '@shared/decorators/user.decorator';
import { ChatMemberParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-member-params-request.dto';
import { ChatRoomParamsRequestDtoV1 } from 'src/chat/dtos/requests/v1/chat-room-params-request.dto';
import { CreateChatRoomRequestDtoV1 } from 'src/chat/dtos/requests/v1/create-chat-room-request.dto';
import { ChatGatewayV1 } from 'src/chat/gateways/v1/chat.gateway';
import {
  ChatMessagesDataV1,
  ChatResponseV1,
  ChatRoomDataV1,
  ChatRoomLeaveResultV1,
  ChatRoomsDataV1,
  ChatUserAddedResultV1,
  ChatUserRemovedDataV1,
} from 'src/chat/interfaces/chat';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

@Controller({ path: 'chat', version: '1' })
export class ChatControllerV1 {
  constructor(
    private readonly chatService: ChatServiceV1,
    private readonly chatGateway: ChatGatewayV1,
  ) {}

  @Post('new')
  @HttpCode(HttpStatus.CREATED)
  async createChatRoom(
    @User('id') userId: string,
    @Body() dto: CreateChatRoomRequestDtoV1,
  ): Promise<ChatResponseV1<ChatRoomDataV1>> {
    const { response, recipientIds } = await this.chatService.createChatRoom(
      userId,
      dto,
    );

    this.chatGateway.emitChatRoomCreated(recipientIds, response.data.room);

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
  ): Promise<ChatResponseV1<ChatRoomsDataV1>> {
    return await this.chatService.getMyChatRooms(userId);
  }

  @Get('messages/:roomId')
  @HttpCode(HttpStatus.OK)
  async getChatMessages(
    @User('id') userId: string,
    @Param() params: ChatRoomParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatMessagesDataV1>> {
    return await this.chatService.getChatMessages(userId, params);
  }

  @Post('invite/:roomId/:userId')
  @HttpCode(HttpStatus.OK)
  async addUserToChatRoom(
    @User('id') callerId: string,
    @Param() params: ChatMemberParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatUserAddedResultV1>> {
    const { response, recipientIds } = await this.chatService.addUserToChatRoom(
      callerId,
      params,
    );

    this.chatGateway.emitUserAddedToChatRoom(recipientIds, response.data);

    return response;
  }

  @Delete('kick/:roomId/:userId')
  @HttpCode(HttpStatus.OK)
  async removeUserFromChatRoom(
    @User('id') callerId: string,
    @Param() params: ChatMemberParamsRequestDtoV1,
  ): Promise<ChatResponseV1<ChatUserRemovedDataV1>> {
    return await this.chatService.removeUserFromChatRoom(callerId, params);
  }
}
