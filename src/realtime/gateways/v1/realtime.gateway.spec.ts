import { SiteRole } from '@prisma/client';
import { TokensService } from '@shared/services/tokens.service';
import { Server } from 'socket.io';
import { RealtimeGatewayV1 } from 'src/realtime/gateways/v1/realtime.gateway';
import { RealtimeSocketV1 } from 'src/realtime/interfaces/realtime';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the gateway gets a mocked service anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('RealtimeGatewayV1', () => {
  const tokensService = { verifyAccessToken: jest.fn() };
  const realtimeService = { getSocketUserRole: jest.fn() };
  const roomEmit = jest.fn();
  const server = {
    use: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: roomEmit }),
  };
  const clientEmit = jest.fn();
  const clientJoin = jest.fn();
  let gateway: RealtimeGatewayV1;

  const createClient = (userId?: string, cookie?: string): RealtimeSocketV1 =>
    ({
      id: 'socket-1',
      data: { userId },
      handshake: { headers: { cookie } },
      emit: clientEmit,
      join: clientJoin,
    }) as unknown as RealtimeSocketV1;

  const runAuthMiddleware = async (client: RealtimeSocketV1): Promise<void> => {
    gateway.afterInit(server as unknown as Server);

    const middleware = server.use.mock.calls[0][0] as (
      socket: RealtimeSocketV1,
      next: () => void,
    ) => void;

    await new Promise<void>((resolve) => middleware(client, resolve));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new RealtimeGatewayV1(
      tokensService as unknown as TokensService,
      realtimeService as unknown as RealtimeServiceV1,
    );
    Object.assign(gateway, { server });
  });

  describe('authentication', () => {
    it('should put userId and role on a socket with a valid accessToken cookie', async () => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      realtimeService.getSocketUserRole.mockResolvedValue(SiteRole.ADMIN);
      const client = createClient(undefined, 'theme=dark; accessToken=tok%3D');

      await runAuthMiddleware(client);

      expect(tokensService.verifyAccessToken).toHaveBeenCalledWith('tok=');
      expect(realtimeService.getSocketUserRole).toHaveBeenCalledWith('user-1');
      expect(client.data).toEqual({ userId: 'user-1', role: SiteRole.ADMIN });
    });

    it('should leave a socket without a cookie a guest', async () => {
      const client = createClient();

      await runAuthMiddleware(client);

      expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
      expect(client.data.userId).toBeUndefined();
    });

    it('should leave a banned or deleted user a guest', async () => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      realtimeService.getSocketUserRole.mockResolvedValue(null);
      const client = createClient(undefined, 'accessToken=tok');

      await runAuthMiddleware(client);

      expect(client.data.userId).toBeUndefined();
      expect(client.data.role).toBeUndefined();
    });

    it('should leave a socket with a malformed cookie a guest', async () => {
      const client = createClient(undefined, 'accessToken=%E0%A4%A');

      await runAuthMiddleware(client);

      expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
      expect(client.data.userId).toBeUndefined();
    });

    it('should leave a socket with an invalid token a guest', async () => {
      tokensService.verifyAccessToken.mockRejectedValue(new Error('bad'));
      jest.spyOn(gateway['logger'], 'warn').mockImplementation(() => undefined);
      const client = createClient(undefined, 'accessToken=tok');

      await runAuthMiddleware(client);

      expect(client.data.userId).toBeUndefined();
    });
  });

  describe('handleConnection', () => {
    it('should join an authenticated socket to its personal room', async () => {
      await gateway.handleConnection(createClient('user-1'));

      expect(clientJoin).toHaveBeenCalledWith('user-1');
      expect(clientEmit).not.toHaveBeenCalled();
    });

    it('should answer a guest with auth:error for notificationInit', async () => {
      await gateway.handleConnection(createClient());

      expect(clientJoin).not.toHaveBeenCalled();
      expect(clientEmit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for notificationInit',
      });
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
      gateway.replyToBotMessage(createClient(), 'hello');

      expect(clientEmit).toHaveBeenCalledWith(
        'botReply',
        'Бот відповідає на: "hello"',
      );
    });
  });
});
