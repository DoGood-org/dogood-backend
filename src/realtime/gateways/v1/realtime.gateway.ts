import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Public } from '@shared/decorators/public.decorator';
import { TokensService } from '@shared/services/tokens.service';
import { ExtendedError, Server } from 'socket.io';
import { RealtimeSocketV1 } from 'src/realtime/interfaces/realtime';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

// NOTE: every gateway on the default namespace shares one socket.io server; this one owns auth and personal rooms.
// `@Public()` keeps the global HTTP AuthGuard off the socket handlers; sockets authenticate in `afterInit`.
@Public()
@WebSocketGateway()
export class RealtimeGatewayV1 implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGatewayV1.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly realtimeService: RealtimeServiceV1,
  ) {}

  // NOTE: a middleware, not `handleConnection`, so the user is known before the first event arrives.
  afterInit(server: Server): void {
    server.use(
      (client: RealtimeSocketV1, next: (error?: ExtendedError) => void) => {
        void this.authenticateSocket(client).finally(() => next());
      },
    );
  }

  // NOTE: a guest gets `auth:error` for `notificationInit` on every connection (legacy).
  async handleConnection(client: RealtimeSocketV1): Promise<void> {
    const userId = this.getAuthorizedUserId(client, 'notificationInit');

    if (userId) {
      await client.join(userId);
    }
  }

  // NOTE: legacy echo stub without an LLM; its home is a future AiModule.
  @SubscribeMessage('messageToBot')
  replyToBotMessage(
    @ConnectedSocket() client: RealtimeSocketV1,
    @MessageBody() message: string,
  ): void {
    client.emit('botReply', `Бот відповідає на: "${message}"`);
  }

  // NOTE: `to([])` would broadcast to every socket, so an empty recipient list emits nothing.
  emitToUsers(userIds: string[], event: string, payload: object): void {
    if (userIds.length === 0) {
      return;
    }

    this.server.to(userIds).emit(event, payload);
  }

  getAuthorizedUserId(
    client: RealtimeSocketV1,
    event: string,
  ): string | undefined {
    const { userId } = client.data;

    if (!userId) {
      client.emit('auth:error', { error: `Unauthorized for ${event}` });
    }

    return userId;
  }

  // NOTE: a bad or missing token leaves the socket a guest, it is not disconnected (legacy).
  // Nothing may throw out of here: the middleware voids this promise.
  private async authenticateSocket(client: RealtimeSocketV1): Promise<void> {
    try {
      const accessToken = this.getAccessTokenCookie(
        client.handshake.headers.cookie,
      );

      if (!accessToken) {
        return;
      }

      const { sub } = await this.tokensService.verifyAccessToken(accessToken);
      const role = await this.realtimeService.getSocketUserRole(sub);

      if (role !== null) {
        client.data.userId = sub;
        client.data.role = role;
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
}
