import { WsException } from '@nestjs/websockets';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';
import { ChatMessageServiceV1 } from 'src/chat/services/v1/chat-message.service';

describe('ChatMessageServiceV1', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    chatMembership: { findFirst: jest.fn() },
    chatMessage: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    chatMessageReaction: { upsert: jest.fn() },
  };
  const service = new ChatMessageServiceV1(
    prisma as unknown as PrismaService,
    new ChatMapperV1(),
  );

  const expectWsError = async (
    promise: Promise<unknown>,
    message: string,
  ): Promise<void> => {
    const error: unknown = await promise.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(WsException);
    expect((error as WsException).message).toBe(message);
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('isUserAllowedToConnect', () => {
    it.each([
      [null, false],
      [{ status: UserStatus.BANNED }, false],
      [{ status: UserStatus.ACTIVE }, true],
    ])('should map user %p to %p', async (user, expected) => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.isUserAllowedToConnect('user-1')).resolves.toBe(
        expected,
      );
    });
  });

  describe('isActiveChatMember', () => {
    it.each([
      [null, false],
      [{ leftAt: new Date() }, false],
      [{ leftAt: null }, true],
    ])('should map membership %p to %p', async (membership, expected) => {
      prisma.chatMembership.findFirst.mockResolvedValue(membership);

      await expect(
        service.isActiveChatMember('user-1', 'chat-1'),
      ).resolves.toBe(expected);
      expect(prisma.chatMembership.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          chatId: 'chat-1',
          deletedAt: null,
          chat: { deletedAt: null },
        },
        select: { leftAt: true },
      });
    });
  });

  describe('canSendChatMessage', () => {
    it('should throw for a non-member', async () => {
      prisma.chatMembership.findFirst.mockResolvedValue(null);

      await expectWsError(
        service.canSendChatMessage('user-1', 'chat-1'),
        'User user-1 is not a participant in room chat-1',
      );
    });

    it('should refuse a member who left without an error', async () => {
      prisma.chatMembership.findFirst.mockResolvedValue({ leftAt: new Date() });

      await expect(
        service.canSendChatMessage('user-1', 'chat-1'),
      ).resolves.toBe(false);
    });
  });

  describe('sendChatMessage', () => {
    it.each([
      ['   ', 'Message content is empty'],
      ['x'.repeat(501), 'Message content exceeds 500 characters'],
    ])('should reject content %p', async (content, message) => {
      await expectWsError(
        service.sendChatMessage('user-1', { eventId: 'chat-1', content }),
        message,
      );
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    });

    it('should store the trimmed content and return the newMessage payload', async () => {
      const createdAt = new Date('2026-09-25T10:00:00.000Z');

      prisma.chatMessage.create.mockResolvedValue({
        id: 'message-1',
        senderId: 'user-1',
        chatId: 'chat-1',
        content: 'hi',
        createdAt,
        updatedAt: createdAt,
        sender: {
          id: 'user-1',
          name: 'Ann',
          role: SiteRole.USER,
          userProfile: null,
        },
        reactions: [],
      });

      const event = await service.sendChatMessage('user-1', {
        eventId: 'chat-1',
        content: '  hi  ',
      });

      expect(prisma.chatMessage.create.mock.calls[0][0].data).toEqual({
        senderId: 'user-1',
        chatId: 'chat-1',
        content: 'hi',
      });
      expect(event).toEqual({
        eventId: 'chat-1',
        messageId: 'message-1',
        content: 'hi',
        timestamp: '2026-09-25T10:00:00.000Z',
        user: { id: 'user-1', name: 'Ann', siteRole: SiteRole.USER },
      });
    });
  });

  describe('editChatMessage', () => {
    const payload = { eventId: 'chat-1', messageId: 'message-1' };

    it.each([
      ['  ', 'New message content is empty'],
      ['x'.repeat(501), 'Content exceeds 500 characters'],
    ])('should reject content %p', async (newContent, message) => {
      await expectWsError(
        service.editChatMessage('user-1', { ...payload, newContent }),
        message,
      );
    });

    it('should reject a deleted or foreign message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue(null);

      await expectWsError(
        service.editChatMessage('user-1', { ...payload, newContent: 'new' }),
        'Message with ID message-1 not found or user user-1 is not the sender.',
      );
      expect(prisma.chatMessage.findFirst).toHaveBeenCalledWith({
        where: { id: 'message-1', senderId: 'user-1', deletedAt: null },
        select: { content: true },
      });
    });

    it('should skip the update when the content is unchanged', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({ content: 'same' });

      const event = await service.editChatMessage('user-1', {
        ...payload,
        newContent: ' same ',
      });

      expect(prisma.chatMessage.update).not.toHaveBeenCalled();
      expect(event).toEqual({ messageId: 'message-1', newContent: 'same' });
    });

    it('should update changed content', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({ content: 'old' });

      await service.editChatMessage('user-1', {
        ...payload,
        newContent: 'new',
      });

      expect(prisma.chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: { content: 'new' },
        select: { id: true },
      });
    });
  });

  describe('deleteChatMessage', () => {
    const payload = { eventId: 'chat-1', messageId: 'message-1' };

    it('should reject a missing message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue(null);

      await expectWsError(
        service.deleteChatMessage('user-1', payload),
        'Message not found',
      );
    });

    it('should reject a foreign message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({ senderId: 'user-2' });

      await expectWsError(
        service.deleteChatMessage('user-1', payload),
        'Forbidden: not your message',
      );
    });

    it('should soft-delete own message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({ senderId: 'user-1' });

      const event = await service.deleteChatMessage('user-1', payload);

      expect(prisma.chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: { deletedAt: expect.any(Date) },
        select: { id: true },
      });
      expect(event).toEqual({ messageId: 'message-1' });
    });
  });

  describe('reactToChatMessage', () => {
    const payload = {
      eventId: 'chat-1',
      messageId: 'message-1',
      reaction: ':)',
    };

    it('should reject when the user is not an active member of the message chat', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue(null);

      await expectWsError(
        service.reactToChatMessage('user-1', payload),
        'Message not found or user not in the room',
      );
      expect(prisma.chatMessageReaction.upsert).not.toHaveBeenCalled();
    });

    it('should upsert one reaction per user and message', async () => {
      prisma.chatMessage.findFirst.mockResolvedValue({ id: 'message-1' });

      const event = await service.reactToChatMessage('user-1', payload);

      expect(prisma.chatMessageReaction.upsert).toHaveBeenCalledWith({
        where: {
          messageId_userId: { messageId: 'message-1', userId: 'user-1' },
        },
        update: { reaction: ':)' },
        create: { messageId: 'message-1', userId: 'user-1', reaction: ':)' },
        select: { id: true },
      });
      expect(event).toEqual({ ...payload, userId: 'user-1' });
    });
  });
});
