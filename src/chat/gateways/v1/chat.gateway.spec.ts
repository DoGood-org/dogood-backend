import { WsException } from '@nestjs/websockets';
import { TokensService } from '@shared/services/tokens.service';
import { ChatGatewayV1 } from 'src/chat/gateways/v1/chat.gateway';
import { ChatSocketV1 } from 'src/chat/interfaces/chat';
import { ChatMessageServiceV1 } from 'src/chat/services/v1/chat-message.service';
import { Server } from 'socket.io';

// NOTE: `jose` ships ESM only, which Jest does not transform; the gateway gets a mocked service anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('ChatGatewayV1', () => {
  const tokensService = { verifyAccessToken: jest.fn() };
  const chatMessageService = {
    isUserAllowedToConnect: jest.fn(),
    isActiveChatMember: jest.fn(),
    canSendChatMessage: jest.fn(),
    sendChatMessage: jest.fn(),
    editChatMessage: jest.fn(),
    deleteChatMessage: jest.fn(),
    reactToChatMessage: jest.fn(),
  };
  const roomEmit = jest.fn();
  const server = {
    use: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: roomEmit }),
  };
  let gateway: ChatGatewayV1;

  const clientEmit = jest.fn();
  const clientJoin = jest.fn();

  const createClient = (userId?: string, cookie?: string): ChatSocketV1 =>
    ({
      id: `socket-${Math.random()}`,
      data: { userId },
      handshake: { headers: { cookie } },
      emit: clientEmit,
      join: clientJoin,
      leave: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: roomEmit }),
    }) as unknown as ChatSocketV1;

  const runAuthMiddleware = async (client: ChatSocketV1): Promise<void> => {
    gateway.afterInit(server as unknown as Server);

    const middleware = server.use.mock.calls[0][0] as (
      socket: ChatSocketV1,
      next: () => void,
    ) => void;

    await new Promise<void>((resolve) => middleware(client, resolve));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new ChatGatewayV1(
      tokensService as unknown as TokensService,
      chatMessageService as unknown as ChatMessageServiceV1,
    );
    Object.assign(gateway, { server });
  });

  describe('authentication', () => {
    it('should authenticate a socket with a valid accessToken cookie', async () => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      chatMessageService.isUserAllowedToConnect.mockResolvedValue(true);
      const client = createClient(undefined, 'theme=dark; accessToken=tok%3D');

      await runAuthMiddleware(client);

      expect(tokensService.verifyAccessToken).toHaveBeenCalledWith('tok=');
      expect(client.data.userId).toBe('user-1');
    });

    it.each([
      ['no cookie', undefined, true],
      ['a banned user', 'accessToken=tok', false],
    ])('should leave %s a guest', async (_label, cookie, allowed) => {
      tokensService.verifyAccessToken.mockResolvedValue({ sub: 'user-1' });
      chatMessageService.isUserAllowedToConnect.mockResolvedValue(allowed);
      const client = createClient(undefined, cookie);

      await runAuthMiddleware(client);

      expect(client.data.userId).toBeUndefined();
    });

    it('should leave a socket with a malformed cookie a guest', async () => {
      const client = createClient(undefined, 'accessToken=%E0%A4%A');

      await runAuthMiddleware(client);

      expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
      expect(client.data.userId).toBeUndefined();
    });

    it('should leave a socket with an invalid token a guest', async () => {
      tokensService.verifyAccessToken.mockRejectedValue(new Error('bad'));
      const client = createClient(undefined, 'accessToken=tok');

      await runAuthMiddleware(client);

      expect(client.data.userId).toBeUndefined();
    });

    it('should join an authenticated socket to its personal room', async () => {
      const client = createClient('user-1');

      await gateway.handleConnection(client);

      expect(clientJoin).toHaveBeenCalledWith('user-1');
    });

    it('should answer a guest with auth:error and an error ack', async () => {
      const client = createClient();

      const ack = await gateway.sendMessage(client, {
        eventId: 'chat-1',
        content: 'hi',
      });

      expect(clientEmit).toHaveBeenCalledWith('auth:error', {
        error: 'Unauthorized for sendMessage',
      });
      expect(ack).toEqual({ error: 'Unauthorized for sendMessage' });
      expect(chatMessageService.canSendChatMessage).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    const payload = { eventId: 'chat-1', content: 'hi' };

    it('should broadcast newMessage to the room and ack success', async () => {
      const newMessage = { eventId: 'chat-1', messageId: 'message-1' };

      chatMessageService.canSendChatMessage.mockResolvedValue(true);
      chatMessageService.sendChatMessage.mockResolvedValue(newMessage);

      const ack = await gateway.sendMessage(createClient('user-1'), payload);

      expect(server.to).toHaveBeenCalledWith('chat-1');
      expect(roomEmit).toHaveBeenCalledWith('newMessage', newMessage);
      expect(ack).toEqual({ success: true });
    });

    it('should send no ack to a member who left', async () => {
      chatMessageService.canSendChatMessage.mockResolvedValue(false);

      const ack = await gateway.sendMessage(createClient('user-1'), payload);

      expect(ack).toBeUndefined();
      expect(chatMessageService.sendChatMessage).not.toHaveBeenCalled();
    });

    it('should ack the message of a WsException', async () => {
      chatMessageService.canSendChatMessage.mockRejectedValue(
        new WsException('User user-1 is not a participant in room chat-1'),
      );

      const ack = await gateway.sendMessage(createClient('user-1'), payload);

      expect(ack).toEqual({
        error: 'User user-1 is not a participant in room chat-1',
      });
    });

    it('should hide unexpected errors behind a generic ack', async () => {
      chatMessageService.canSendChatMessage.mockResolvedValue(true);
      chatMessageService.sendChatMessage.mockRejectedValue(
        new TypeError('content.trim is not a function'),
      );
      jest
        .spyOn(gateway['logger'], 'error')
        .mockImplementation(() => undefined);

      const ack = await gateway.sendMessage(createClient('user-1'), payload);

      expect(ack).toEqual({ error: 'Internal server error' });
    });
  });

  describe('reactToMessage', () => {
    it('should broadcast messageReacted to the room', async () => {
      const reacted = {
        eventId: 'chat-1',
        messageId: 'message-1',
        reaction: ':)',
        userId: 'user-1',
      };

      chatMessageService.canSendChatMessage.mockResolvedValue(true);
      chatMessageService.reactToChatMessage.mockResolvedValue(reacted);

      const ack = await gateway.reactToMessage(createClient('user-1'), {
        eventId: 'chat-1',
        messageId: 'message-1',
        reaction: ':)',
      });

      expect(roomEmit).toHaveBeenCalledWith('messageReacted', reacted);
      expect(ack).toEqual({ success: true });
    });
  });

  describe('joinEventRoom', () => {
    it('should emit error to a non-member', async () => {
      chatMessageService.isActiveChatMember.mockResolvedValue(false);
      const client = createClient('user-1');

      await gateway.joinEventRoom(client, { eventId: 'chat-1' });

      expect(clientEmit).toHaveBeenCalledWith('error', {
        message: 'You do not have permission to join this room.',
      });
      expect(clientJoin).not.toHaveBeenCalled();
    });

    it('should announce presence once per user and join the room', async () => {
      chatMessageService.isActiveChatMember.mockResolvedValue(true);
      const first = createClient('user-1');
      const second = createClient('user-1');

      await gateway.joinEventRoom(first, { eventId: 'chat-1' });
      await gateway.joinEventRoom(second, { eventId: 'chat-1' });

      expect(server.emit).toHaveBeenCalledTimes(1);
      expect(server.emit).toHaveBeenCalledWith('userOnline', {
        userId: 'user-1',
      });
      expect(clientJoin).toHaveBeenCalledWith('chat-1');
      expect(roomEmit).toHaveBeenCalledWith('userJoined', { userId: 'user-1' });

      gateway.handleDisconnect(first);
      expect(server.emit).toHaveBeenCalledTimes(1);

      gateway.handleDisconnect(second);
      expect(server.emit).toHaveBeenLastCalledWith('userOffline', {
        userId: 'user-1',
      });
    });
  });

  describe('typing', () => {
    it('should throttle userTyping per socket', () => {
      const client = createClient('user-1');

      gateway.typing(client, { eventId: 'chat-1' });
      gateway.typing(client, { eventId: 'chat-1' });

      expect(roomEmit).toHaveBeenCalledTimes(1);
      expect(roomEmit).toHaveBeenCalledWith('userTyping', {
        eventId: 'chat-1',
        userId: 'user-1',
      });
    });
  });

  describe('REST broadcasts', () => {
    it('should emit only to the personal rooms of the recipients', () => {
      gateway.emitUserLeftChatRoom(['user-1', 'user-2'], {
        roomId: 'chat-1',
        userId: 'user-2',
        status: 'userQuit',
        roomStatus: 'deleted',
      });

      expect(server.to).toHaveBeenCalledWith(['user-1', 'user-2']);
      expect(roomEmit).toHaveBeenCalledWith('UserLeftRoom', {
        userId: 'user-2',
        roomId: 'chat-1',
      });
      expect(roomEmit).toHaveBeenCalledWith('NoOneLeftInTheRoom', {
        roomId: 'chat-1',
      });
      expect(server.emit).not.toHaveBeenCalled();
    });

    it('should emit nothing to an empty recipient list', () => {
      gateway.emitUserAddedToChatRoom([], {
        roomId: 'chat-1',
        user: { id: 'user-2', name: 'Bob', siteRole: 'USER' },
        status: 'added',
      });

      expect(server.to).not.toHaveBeenCalled();
    });
  });
});
