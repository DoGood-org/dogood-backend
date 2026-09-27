import { Logger, OnModuleDestroy } from '@nestjs/common';
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
import { ExtendedError } from 'socket.io';
import {
  RealtimeServerV1,
  RealtimeSocketV1,
} from 'src/realtime/interfaces/realtime';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

const SESSION_SWEEP_INTERVAL_MS = 60_000;

// NOTE: every gateway on the default namespace shares one socket.io server; this one owns auth and personal rooms.
// `@Public()` keeps the global HTTP AuthGuard off the socket handlers; sockets authenticate in `afterInit`.
@Public()
@WebSocketGateway()
export class RealtimeGatewayV1
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: RealtimeServerV1;

  private readonly logger = new Logger(RealtimeGatewayV1.name);

  private sessionSweep?: NodeJS.Timeout;

  constructor(
    private readonly tokensService: TokensService,
    private readonly realtimeService: RealtimeServiceV1,
  ) {}

  // NOTE: a middleware, not `handleConnection`, so the user is known before the first event arrives.
  afterInit(server: RealtimeServerV1): void {
    server.use(
      (client: RealtimeSocketV1, next: (error?: ExtendedError) => void) => {
        void this.authenticateSocket(client).finally(() => next());
      },
    );

    // NOTE: sockets that only listen never hit `getAuthorizedUserId`; the sweep drops them once their session dies.
    this.sessionSweep = setInterval(() => {
      void this.disconnectInactiveSessions();
    }, SESSION_SWEEP_INTERVAL_MS);
    this.sessionSweep.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sessionSweep);
  }

  // NOTE: a guest gets `auth:error` for `notificationInit` on every connection (legacy).
  async handleConnection(client: RealtimeSocketV1): Promise<void> {
    const { userId } = client.data;

    if (!userId) {
      this.emitAuthError(client, 'notificationInit');

      return;
    }

    await client.join(userId);
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

  // NOTE: every authorized event re-checks the session, like AuthGuard on HTTP: a logout, ban, soft delete or
  // role change since the handshake disconnects the socket.
  async getAuthorizedUserId(
    client: RealtimeSocketV1,
    event: string,
  ): Promise<string | undefined> {
    const { userId, role, sessionId } = client.data;

    if (!userId || !role || !sessionId) {
      this.emitAuthError(client, event);

      return undefined;
    }

    if (!(await this.realtimeService.isSocketSessionActive(sessionId, role))) {
      this.emitAuthError(client, event);
      client.disconnect(true);

      return undefined;
    }

    return userId;
  }

  private emitAuthError(client: RealtimeSocketV1, event: string): void {
    client.emit('auth:error', { error: `Unauthorized for ${event}` });
  }

  private async disconnectInactiveSessions(): Promise<void> {
    try {
      const sockets = [...this.server.sockets.sockets.values()];
      const sessionIds = new Set(
        sockets.flatMap(({ data }) => (data.sessionId ? [data.sessionId] : [])),
      );

      if (sessionIds.size === 0) {
        return;
      }

      const activeRoles =
        await this.realtimeService.getActiveSocketSessionRoles([...sessionIds]);

      for (const socket of sockets) {
        const { sessionId, role } = socket.data;

        if (sessionId && activeRoles.get(sessionId) !== role) {
          socket.disconnect(true);
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  // NOTE: a bad or missing token leaves the socket a guest, it is not disconnected (legacy).
  // Nothing may throw out of here: the middleware voids this promise.
  private async authenticateSocket(client: RealtimeSocketV1): Promise<void> {
    try {
      const { cookie } = client.handshake.headers;
      const accessToken = this.getCookie(cookie, 'accessToken');
      const refreshToken = this.getCookie(cookie, 'refreshToken');

      if (!accessToken || !refreshToken) {
        return;
      }

      const { sub } = await this.tokensService.verifyAccessToken(accessToken);
      const session = await this.realtimeService.findSocketSession(
        sub,
        refreshToken,
      );

      if (session !== null) {
        const { sessionId, role } = session;

        client.data.userId = sub;
        client.data.role = role;
        client.data.sessionId = sessionId;
      }
    } catch {
      this.logger.warn(`Socket auth fallback to guest: ${client.id}`);
    }
  }

  private getCookie(
    cookieHeader: string | undefined,
    cookieName: string,
  ): string | undefined {
    for (const cookie of cookieHeader?.split(';') ?? []) {
      const [name, ...value] = cookie.trim().split('=');

      if (name === cookieName) {
        return decodeURIComponent(value.join('='));
      }
    }

    return undefined;
  }
}
