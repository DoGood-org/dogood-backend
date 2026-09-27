import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Public } from '@shared/decorators/public.decorator';
import { Server } from 'socket.io';
import {
  ChatEventRoomPayloadV1,
  ChatRoomLeaveResultV1,
  ChatRoomV1,
  ChatSocketAckV1,
  ChatSocketV1,
  ChatUserAddedResultV1,
  DeleteChatMessagePayloadV1,
  EditChatMessagePayloadV1,
  ReactToChatMessagePayloadV1,
  SendChatMessagePayloadV1,
} from 'src/chat/interfaces/chat';
import { ChatMessageServiceV1 } from 'src/chat/services/v1/chat-message.service';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';

const TYPING_THROTTLE_MS = 800;

// NOTE: `@Public()` keeps the global HTTP AuthGuard off the socket handlers; sockets authenticate in RealtimeGatewayV1.
@Public()
@WebSocketGateway()
export class ChatGatewayV1 implements OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ChatGatewayV1.name);

  // NOTE: in-memory presence (userId -> socket ids) works on a single instance only; scaling out needs the Redis adapter.
  private readonly onlineSockets = new Map<string, Set<string>>();

  constructor(
    private readonly chatMessageService: ChatMessageServiceV1,
    private readonly realtimeGateway: RealtimeGatewayV1,
  ) {}

  async handleDisconnect(client: ChatSocketV1): Promise<void> {
    const { userId } = client.data;

    if (!userId || !this.removeOnlineSocket(userId, client.id)) {
      return;
    }

    try {
      await this.emitPresence(userId, 'userOffline');
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('joinEventRoom')
  async joinEventRoom(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): Promise<void> {
    const userId = this.realtimeGateway.getAuthorizedUserId(
      client,
      'joinEventRoom',
    );

    if (!userId) {
      return;
    }

    try {
      const { eventId } = payload;
      const isMember = await this.chatMessageService.isActiveChatMember(
        userId,
        eventId,
      );

      if (!isMember) {
        client.emit('error', {
          message: 'You do not have permission to join this room.',
        });

        return;
      }

      if (this.addOnlineSocket(userId, client.id)) {
        await this.emitPresence(userId, 'userOnline');
      }

      await client.join(eventId);
      this.server.to(eventId).emit('userJoined', { userId });
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: SendChatMessagePayloadV1,
  ): Promise<ChatSocketAckV1 | undefined> {
    return await this.runChatMessageAction(
      client,
      'sendMessage',
      payload,
      async (userId: string) => {
        const newMessage = await this.chatMessageService.sendChatMessage(
          userId,
          payload,
        );

        this.server.to(newMessage.eventId).emit('newMessage', newMessage);
      },
    );
  }

  @SubscribeMessage('editMessage')
  async editMessage(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: EditChatMessagePayloadV1,
  ): Promise<ChatSocketAckV1 | undefined> {
    return await this.runChatMessageAction(
      client,
      'editMessage',
      payload,
      async (userId: string) => {
        const editedMessage = await this.chatMessageService.editChatMessage(
          userId,
          payload,
        );

        this.server.to(payload.eventId).emit('messageEdited', editedMessage);
      },
    );
  }

  @SubscribeMessage('deleteMessage')
  async deleteMessage(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: DeleteChatMessagePayloadV1,
  ): Promise<ChatSocketAckV1 | undefined> {
    return await this.runChatMessageAction(
      client,
      'deleteMessage',
      payload,
      async (userId: string) => {
        const deletedMessage = await this.chatMessageService.deleteChatMessage(
          userId,
          payload,
        );

        this.server.to(payload.eventId).emit('messageDeleted', deletedMessage);
      },
    );
  }

  @SubscribeMessage('reactToMessage')
  async reactToMessage(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ReactToChatMessagePayloadV1,
  ): Promise<ChatSocketAckV1 | undefined> {
    return await this.runChatMessageAction(
      client,
      'reactToMessage',
      payload,
      async (userId: string) => {
        const reactedMessage = await this.chatMessageService.reactToChatMessage(
          userId,
          payload,
        );

        this.server
          .to(reactedMessage.eventId)
          .emit('messageReacted', reactedMessage);
      },
    );
  }

  // NOTE: legacy broadcast into any room; now only into one this socket joined, i.e. passed the membership check.
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): void {
    const userId = this.realtimeGateway.getAuthorizedUserId(client, 'typing');

    if (!userId) {
      return;
    }

    const { eventId } = payload;

    if (!client.rooms.has(eventId)) {
      return;
    }

    const { lastTypingAt } = client.data;
    const now = Date.now();

    if (lastTypingAt !== undefined && now - lastTypingAt < TYPING_THROTTLE_MS) {
      return;
    }

    client.data.lastTypingAt = now;
    client.to(eventId).emit('userTyping', { eventId, userId });
  }

  // NOTE: same room check as `typing`: no `userLeft` for a room the socket never joined.
  @SubscribeMessage('leaveEventRoom')
  async leaveEventRoom(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): Promise<void> {
    const userId = this.realtimeGateway.getAuthorizedUserId(
      client,
      'leaveEventRoom',
    );

    if (!userId) {
      return;
    }

    try {
      const { eventId } = payload;

      if (!client.rooms.has(eventId)) {
        return;
      }

      await client.leave(eventId);
      this.server.to(eventId).emit('userLeft', { eventId, userId });
    } catch (error) {
      this.logger.error(error);
    }
  }

  emitChatRoomCreated(recipientIds: string[], room: ChatRoomV1): void {
    this.realtimeGateway.emitToUsers(recipientIds, 'chatRoomCreated', room);
  }

  emitUserLeftChatRoom(
    recipientIds: string[],
    result: ChatRoomLeaveResultV1,
  ): void {
    const { roomId, userId, roomStatus } = result;

    this.realtimeGateway.emitToUsers(recipientIds, 'UserLeftRoom', {
      userId,
      roomId,
    });

    if (roomStatus === 'deleted') {
      this.realtimeGateway.emitToUsers(recipientIds, 'NoOneLeftInTheRoom', {
        roomId,
      });
    }
  }

  emitUserAddedToChatRoom(
    recipientIds: string[],
    result: ChatUserAddedResultV1,
  ): void {
    this.realtimeGateway.emitToUsers(recipientIds, 'UserAddedToRoom', result);
  }

  // NOTE: legacy broadcast presence to every socket, guests included; now only to chat peers' personal rooms.
  private async emitPresence(
    userId: string,
    event: 'userOnline' | 'userOffline',
  ): Promise<void> {
    const peerIds = await this.chatMessageService.findChatPeerIds(userId);

    this.realtimeGateway.emitToUsers(peerIds, event, { userId });
  }

  // NOTE: the return value is the ack; `undefined` sends none (a member who left is refused silently, legacy).
  private async runChatMessageAction(
    client: ChatSocketV1,
    event: string,
    payload: ChatEventRoomPayloadV1,
    action: (userId: string) => Promise<void>,
  ): Promise<ChatSocketAckV1 | undefined> {
    const userId = this.realtimeGateway.getAuthorizedUserId(client, event);

    if (!userId) {
      return { error: `Unauthorized for ${event}` };
    }

    try {
      const { eventId } = payload;

      if (
        !(await this.chatMessageService.canSendChatMessage(userId, eventId))
      ) {
        return undefined;
      }

      await action(userId);

      return { success: true };
    } catch (error) {
      if (error instanceof WsException) {
        return { error: error.message };
      }

      this.logger.error(error);

      return { error: 'Internal server error' };
    }
  }

  private addOnlineSocket(userId: string, socketId: string): boolean {
    const socketIds = this.onlineSockets.get(userId) ?? new Set<string>();

    socketIds.add(socketId);
    this.onlineSockets.set(userId, socketIds);

    return socketIds.size === 1;
  }

  private removeOnlineSocket(userId: string, socketId: string): boolean {
    const socketIds = this.onlineSockets.get(userId);

    if (!socketIds?.delete(socketId)) {
      return false;
    }

    if (socketIds.size > 0) {
      return false;
    }

    this.onlineSockets.delete(userId);

    return true;
  }
}
