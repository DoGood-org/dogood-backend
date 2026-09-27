import { SiteRole } from '@prisma/client';
import { TokensService } from '@shared/services/tokens.service';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';
import {
  RealtimeServerV1,
  RealtimeSocketDataV1,
  RealtimeSocketV1,
} from 'src/realtime/interfaces/realtime';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the gateway gets a mocked service anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('RealtimeGatewayV1', () => {
  const tokensService = { verifyAccessToken: jest.fn() };
  const realtimeService = {
    findSocketSession: jest.fn(),
    isSocketSessionActive: jest.fn(),
    getActiveSocketSessionRoles: jest.fn(),
  };
  const roomEmit = jest.fn();
  const connectedSockets = new Map<string, RealtimeSocketV1>();
  const server = {
    use: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: roomEmit }),
    sockets: { sockets: connectedSockets },
  };
  let gateway: RealtimeGatewayV1;

  const session: RealtimeSocketDataV1 = {
    userId: 'user-1',
    role: SiteRole.USER,
    sessionId: 'session-1',
  };

  interface MockedClient {
    socket: RealtimeSocketV1;
    emit: jest.Mock;
    join: jest.Mock;
    disconnect: jest.Mock;
  }

  const createClient = (
    data: RealtimeSocketDataV1 = {},
    cookie?: string,
  ): MockedClient => {
    const emit = jest.fn();
    const join = jest.fn();
    const disconnect = jest.fn();
    const socket = {
      id: 'socket-1',
      data: { ...data },
      handshake: { headers: { cookie } },
      emit,
      join,
      disconnect,
    } as unknown as RealtimeSocketV1;

    return { socket, emit, join, disconnect };
  };

  const runAuthMiddleware = async (client: RealtimeSocketV1): Promise<void> => {
    gateway.afterInit(server as unknown as RealtimeServerV1);

    const middleware = server.use.mock.calls[0][0] as (
      socket: RealtimeSocketV1,
      next: () => void,
    ) => void;

    await new Promise<void>((resolve) => middleware(client, resolve));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    connectedSockets.clear();
    gateway = new RealtimeGatewayV1(
      tokensService as unknown as TokensService,
      realtimeService as unknown as RealtimeServiceV1,
    );
    Object.assign(gateway, { server });
  });

  afterEach(() => {
    gateway.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('authentication', () => {
    it('should bind a socket with valid cookies to its live session', async () => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      realtimeService.findSocketSession.mockResolvedValue({
        sessionId: 'session-1',
        role: SiteRole.ADMIN,
      });
      const client = createClient(
        {},
        'theme=dark; accessToken=tok%3D; refreshToken=ref',
      );

      await runAuthMiddleware(client.socket);

      expect(tokensService.verifyAccessToken).toHaveBeenCalledWith('tok=');
      expect(realtimeService.findSocketSession).toHaveBeenCalledWith(
        'user-1',
        'ref',
      );
      expect(client.socket.data).toEqual({
        userId: 'user-1',
        role: SiteRole.ADMIN,
        sessionId: 'session-1',
      });
    });

    it.each([undefined, 'accessToken=tok', 'refreshToken=ref'])(
      'should leave a socket with cookies %p a guest',
      async (cookie) => {
        const client = createClient({}, cookie);

        await runAuthMiddleware(client.socket);

        expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
        expect(client.socket.data.userId).toBeUndefined();
      },
    );

    it('should leave a socket of a logged-out, banned or deleted session a guest', async () => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      realtimeService.findSocketSession.mockResolvedValue(null);
      const client = createClient({}, 'accessToken=tok; refreshToken=ref');

      await runAuthMiddleware(client.socket);

      expect(client.socket.data).toEqual({});
    });

    it('should leave a socket with a malformed cookie a guest', async () => {
      const client = createClient({}, 'accessToken=%E0%A4%A; refreshToken=ref');

      await runAuthMiddleware(client.socket);

      expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
      expect(client.socket.data.userId).toBeUndefined();
    });

    it('should leave a socket with an invalid token a guest', async () => {
      tokensService.verifyAccessToken.mockRejectedValue(new Error('bad'));
      jest.spyOn(gateway['logger'], 'warn').mockImplementation(() => undefined);
      const client = createClient({}, 'accessToken=tok; refreshToken=ref');

      await runAuthMiddleware(client.socket);

      expect(client.socket.data.userId).toBeUndefined();
    });
  });

  describe('handleConnection', () => {
    it('should join an authenticated socket to its personal room', async () => {
      const client = createClient(session);

      await gateway.handleConnection(client.socket);

      expect(client.join).toHaveBeenCalledWith('user-1');
      expect(client.emit).not.toHaveBeenCalled();
    });

    it('should answer a guest with auth:error for notificationInit', async () => {
      const client = createClient();

      await gateway.handleConnection(client.socket);

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for notificationInit',
      });
    });
  });

  describe('getAuthorizedUserId', () => {
    it('should return the userId of a socket whose session is still active', async () => {
      realtimeService.isSocketSessionActive.mockResolvedValue(true);
      const client = createClient(session);

      await expect(
        gateway.getAuthorizedUserId(client.socket, 'updateTask'),
      ).resolves.toBe('user-1');
      expect(realtimeService.isSocketSessionActive).toHaveBeenCalledWith(
        'session-1',
        SiteRole.USER,
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should answer a guest with auth:error without a database check', async () => {
      const client = createClient();

      await expect(
        gateway.getAuthorizedUserId(client.socket, 'updateTask'),
      ).resolves.toBeUndefined();
      expect(realtimeService.isSocketSessionActive).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for updateTask',
      });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect a socket whose session died since the handshake', async () => {
      realtimeService.isSocketSessionActive.mockResolvedValue(false);
      const client = createClient(session);

      await expect(
        gateway.getAuthorizedUserId(client.socket, 'updateTask'),
      ).resolves.toBeUndefined();
      expect(client.emit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for updateTask',
      });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('session sweep', () => {
    const runSweep = async (): Promise<void> => {
      jest.useFakeTimers();
      gateway.afterInit(server as unknown as RealtimeServerV1);
      await jest.advanceTimersByTimeAsync(60_000);
    };

    it('should disconnect listening sockets whose session died or whose role changed', async () => {
      const active = createClient(session);
      const loggedOut = createClient({ ...session, sessionId: 'session-2' });
      const demoted = createClient({
        ...session,
        role: SiteRole.ADMIN,
        sessionId: 'session-3',
      });
      const guest = createClient();
      connectedSockets.set('a', active.socket);
      connectedSockets.set('b', loggedOut.socket);
      connectedSockets.set('c', demoted.socket);
      connectedSockets.set('d', guest.socket);
      realtimeService.getActiveSocketSessionRoles.mockResolvedValue(
        new Map([
          ['session-1', SiteRole.USER],
          ['session-3', SiteRole.USER],
        ]),
      );

      await runSweep();

      expect(realtimeService.getActiveSocketSessionRoles).toHaveBeenCalledWith([
        'session-1',
        'session-2',
        'session-3',
      ]);
      expect(active.disconnect).not.toHaveBeenCalled();
      expect(loggedOut.disconnect).toHaveBeenCalledWith(true);
      expect(demoted.disconnect).toHaveBeenCalledWith(true);
      expect(guest.disconnect).not.toHaveBeenCalled();
    });

    it('should not query the database when no authenticated socket is connected', async () => {
      connectedSockets.set('a', createClient().socket);

      await runSweep();

      expect(
        realtimeService.getActiveSocketSessionRoles,
      ).not.toHaveBeenCalled();
    });

    it('should log and survive a failed sweep', async () => {
      connectedSockets.set('a', createClient(session).socket);
      realtimeService.getActiveSocketSessionRoles.mockRejectedValue(
        new Error('db down'),
      );
      const logError = jest
        .spyOn(gateway['logger'], 'error')
        .mockImplementation(() => undefined);

      await runSweep();

      expect(logError).toHaveBeenCalled();
    });
  });

  describe('emitToUsers', () => {
    it('should emit to the personal rooms of the recipients', () => {
      gateway.emitToUsers(['user-1', 'user-2'], 'event', { id: 'x' });

      expect(server.to).toHaveBeenCalledWith(['user-1', 'user-2']);
      expect(roomEmit).toHaveBeenCalledWith('event', { id: 'x' });
    });

    it('should emit nothing to an empty recipient list', () => {
      gateway.emitToUsers([], 'event', { id: 'x' });

      expect(server.to).not.toHaveBeenCalled();
    });
  });

  describe('replyToBotMessage', () => {
    it('should echo the message back as botReply', () => {
      const client = createClient();

      gateway.replyToBotMessage(client.socket, 'hello');

      expect(client.emit).toHaveBeenCalledWith(
        'botReply',
        'Бот відповідає на: "hello"',
      );
    });
  });
});
