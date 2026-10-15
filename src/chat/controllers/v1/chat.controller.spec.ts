import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { SuccessCode } from '@shared/constants/api-codes';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { Response } from 'express';
import { ChatControllerV1 } from 'src/chat/controllers/v1/chat.controller';
import { ChatGatewayV1 } from 'src/chat/gateways/v1/chat.gateway';
import { ChatRoomDeliveryV1, ChatRoomV1 } from 'src/chat/interfaces/chat';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the gateway is a test double here anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

const aRoomSeenBy = (name: string): ChatRoomV1 => ({
  id: 'chat-1',
  name,
  interlocutor: null,
  isPinned: false,
  participants: [],
  messages: [],
  lastMessageAt: '2026-10-12T10:00:00.000Z',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
});

describe('ChatControllerV1', () => {
  const chatService = { openDirectChat: jest.fn() };
  const chatGateway = { emitChatRoomCreated: jest.fn() };
  const controller = new ChatControllerV1(
    chatService as unknown as ChatServiceV1,
    chatGateway as unknown as ChatGatewayV1,
  );
  const res = { status: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('openDirectChat', () => {
    const deliveries: ChatRoomDeliveryV1[] = [
      { recipientId: 'ann', room: aRoomSeenBy('Bob') },
      { recipientId: 'bob', room: aRoomSeenBy('Ann') },
    ];
    const response = {
      status: 'success',
      code: SuccessCode.CHAT_ROOM_CREATED,
      message: 'Chat room created successfully',
      data: { room: aRoomSeenBy('Bob') },
    };

    const openAsAnn = async (): Promise<unknown> =>
      await controller.openDirectChat(
        'ann',
        { userId: 'bob' },
        res as unknown as Response,
      );

    it('should answer 201 and announce the room to both sides when it is new', async () => {
      chatService.openDirectChat.mockResolvedValue({
        response,
        deliveries,
        isCreated: true,
      });

      const body = await openAsAnn();

      expect(chatService.openDirectChat).toHaveBeenCalledWith('ann', {
        userId: 'bob',
      });
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(chatGateway.emitChatRoomCreated).toHaveBeenCalledWith(deliveries);
      expect(body).toBe(response);
    });

    it('should answer 200 and announce nothing when the room already exists', async () => {
      chatService.openDirectChat.mockResolvedValue({
        response,
        deliveries: [],
        isCreated: false,
      });

      const body = await openAsAnn();

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(chatGateway.emitChatRoomCreated).not.toHaveBeenCalled();
      expect(body).toBe(response);
    });

    it('should announce nothing when opening fails', async () => {
      chatService.openDirectChat.mockRejectedValue(new Error('boom'));

      await expect(openAsAnn()).rejects.toThrow('boom');
      expect(chatGateway.emitChatRoomCreated).not.toHaveBeenCalled();
    });
  });

  describe('routes', () => {
    const handlerOf = (name: keyof ChatControllerV1): object =>
      Object.getOwnPropertyDescriptor(ChatControllerV1.prototype, name)
        ?.value as object;
    const routeOf = (
      name: keyof ChatControllerV1,
    ): { method: unknown; path: unknown; httpCode: unknown } => ({
      method: Reflect.getMetadata(METHOD_METADATA, handlerOf(name)),
      path: Reflect.getMetadata(PATH_METADATA, handlerOf(name)),
      httpCode: Reflect.getMetadata(HTTP_CODE_METADATA, handlerOf(name)),
    });

    it.each<[keyof ChatControllerV1, RequestMethod, string]>([
      ['pinChatRoom', RequestMethod.POST, 'pin/:roomId'],
      ['unpinChatRoom', RequestMethod.DELETE, 'pin/:roomId'],
      ['reorderPinnedChatRooms', RequestMethod.PATCH, 'pins'],
    ])(
      'should serve %s at %s %s with 200',
      (name: keyof ChatControllerV1, method: RequestMethod, path: string) => {
        expect(routeOf(name)).toEqual({
          method,
          path,
          httpCode: HttpStatus.OK,
        });
      },
    );

    it('should keep every chat route behind authentication', () => {
      const handlerNames = Object.getOwnPropertyNames(
        ChatControllerV1.prototype,
      ).filter((name) => name !== 'constructor');

      expect(Reflect.getMetadata(IS_PUBLIC_KEY, ChatControllerV1)).toBe(
        undefined,
      );

      for (const name of handlerNames) {
        expect([
          name,
          Reflect.getMetadata(
            IS_PUBLIC_KEY,
            handlerOf(name as keyof ChatControllerV1),
          ),
        ]).toEqual([name, undefined]);
      }
    });

    it('should no longer serve the group chat routes', () => {
      const servedPaths = Object.getOwnPropertyNames(ChatControllerV1.prototype)
        .filter((name) => name !== 'constructor')
        .map((name) =>
          Reflect.getMetadata(
            PATH_METADATA,
            handlerOf(name as keyof ChatControllerV1),
          ),
        );

      expect(servedPaths).not.toContain('new');
      expect(servedPaths).not.toContain('invite/:roomId/:userId');
      expect(servedPaths).not.toContain('kick/:roomId/:userId');
    });
  });
});
