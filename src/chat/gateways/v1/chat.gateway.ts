import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Public } from '@shared/decorators/public.decorator';
import { TokensService } from '@shared/services/tokens.service';
import { ExtendedError, Server } from 'socket.io';
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

const TYPING_THROTTLE_MS = 800;

// NOTE: `@Public()` keeps the global HTTP AuthGuard off the socket handlers; sockets authenticate in `afterInit`.
@Public()
@WebSocketGateway()
export class ChatGatewayV1
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ChatGatewayV1.name);

  // NOTE: in-memory presence (userId -> socket ids) works on a single instance only; scaling out needs the Redis adapter.
  private readonly onlineSockets = new Map<string, Set<string>>();

  constructor(
    private readonly tokensService: TokensService,
    private readonly chatMessageService: ChatMessageServiceV1,
  ) {}

  // NOTE: a middleware, not `handleConnection`, so the user is known before the first event arrives.
  afterInit(server: Server): void {
    server.use(
      (client: ChatSocketV1, next: (error?: ExtendedError) => void) => {
        void this.authenticateSocket(client).finally(() => next());
      },
    );
  }

  async handleConnection(client: ChatSocketV1): Promise<void> {
    const { userId } = client.data;

    if (userId) {
      await client.join(userId);
    }
  }

  handleDisconnect(client: ChatSocketV1): void {
    const { userId } = client.data;

    if (userId && this.removeOnlineSocket(userId, client.id)) {
      this.server.emit('userOffline', { userId });
    }
  }

  @SubscribeMessage('joinEventRoom')
  async joinEventRoom(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): Promise<void> {
    const userId = this.getAuthorizedUserId(client, 'joinEventRoom');

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
        this.server.emit('userOnline', { userId });
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

  // NOTE: no membership check (legacy): the event carries only the sender's own id.
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): void {
    const userId = this.getAuthorizedUserId(client, 'typing');

    if (!userId) {
      return;
    }

    const { eventId } = payload;
    const { lastTypingAt } = client.data;
    const now = Date.now();

    if (lastTypingAt !== undefined && now - lastTypingAt < TYPING_THROTTLE_MS) {
      return;
    }

    client.data.lastTypingAt = now;
    client.to(eventId).emit('userTyping', { eventId, userId });
  }

  // NOTE: no membership check (legacy): the event carries only the sender's own id.
  @SubscribeMessage('leaveEventRoom')
  async leaveEventRoom(
    @ConnectedSocket() client: ChatSocketV1,
    @MessageBody() payload: ChatEventRoomPayloadV1,
  ): Promise<void> {
    const userId = this.getAuthorizedUserId(client, 'leaveEventRoom');

    if (!userId) {
      return;
    }

    try {
      const { eventId } = payload;

      await client.leave(eventId);
      this.server.to(eventId).emit('userLeft', { eventId, userId });
    } catch (error) {
      this.logger.error(error);
    }
  }

  emitChatRoomCreated(recipientIds: string[], room: ChatRoomV1): void {
    this.emitToUsers(recipientIds, 'chatRoomCreated', room);
  }

  emitUserLeftChatRoom(
    recipientIds: string[],
    result: ChatRoomLeaveResultV1,
  ): void {
    const { roomId, userId, roomStatus } = result;

    this.emitToUsers(recipientIds, 'UserLeftRoom', { userId, roomId });

    if (roomStatus === 'deleted') {
      this.emitToUsers(recipientIds, 'NoOneLeftInTheRoom', { roomId });
    }
  }

  emitUserAddedToChatRoom(
    recipientIds: string[],
    result: ChatUserAddedResultV1,
  ): void {
    this.emitToUsers(recipientIds, 'UserAddedToRoom', result);
  }

  // NOTE: `to([])` would broadcast to every socket, so an empty recipient list emits nothing.
  private emitToUsers(userIds: string[], event: string, payload: object): void {
    if (userIds.length === 0) {
      return;
    }

    this.server.to(userIds).emit(event, payload);
  }

  // NOTE: a bad or missing token leaves the socket a guest, it is not disconnected (legacy).
  // Nothing may throw out of here: the middleware voids this promise.
  private async authenticateSocket(client: ChatSocketV1): Promise<void> {
    try {
      const accessToken = this.getAccessTokenCookie(
        client.handshake.headers.cookie,
      );

      if (!accessToken) {
        return;
      }

      const { sub } = await this.tokensService.verifyAccessToken(accessToken);

      if (await this.chatMessageService.isUserAllowedToConnect(sub)) {
        client.data.userId = sub;
      }
    } catch {
      this.logger.warn(`Socket auth fallback to guest: ${client.id}`);
    }
  }

  private getAccessTokenCookie(cookieHeader?: string): string | undefined {
    for (const cookie of cookieHeader?.split(';') ?? []) {
      const [name, ...value] = cookie.trim().split('=');

      if (name === 'accessToken') {
        return decodeURIComponent(value.join('='));
      }
    }

    return undefined;
  }

  private getAuthorizedUserId(
    client: ChatSocketV1,
    event: string,
  ): string | undefined {
    const { userId } = client.data;

    if (!userId) {
      client.emit('auth:error', { error: `Unauthorized for ${event}` });
    }

    return userId;
  }

  // NOTE: the return value is the ack; `undefined` sends none (a member who left is refused silently, legacy).
  private async runChatMessageAction(
    client: ChatSocketV1,
    event: string,
    payload: ChatEventRoomPayloadV1,
    action: (userId: string) => Promise<void>,
  ): Promise<ChatSocketAckV1 | undefined> {
    const userId = this.getAuthorizedUserId(client, event);

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
