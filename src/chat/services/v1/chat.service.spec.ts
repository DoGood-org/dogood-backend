import { HttpStatus } from '@nestjs/common';
import { ChatType, Prisma, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

describe('ChatServiceV1', () => {
  const prisma = {
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    chat: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatMembership: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    chatMessage: { findMany: jest.fn() },
  };
  const service = new ChatServiceV1(
    prisma as unknown as PrismaService,
    new ChatMapperV1(),
  );
  const date = new Date('2026-09-25T10:00:00.000Z');
  const user = (id: string): object => ({
    id,
    name: `name-${id}`,
    role: SiteRole.USER,
    userProfile: null,
  });
  const roomRecord = {
    id: 'chat-1',
    ownerId: 'owner',
    type: ChatType.GROUP,
    name: 'Chat',
    description: '',
    createdAt: date,
    updatedAt: date,
    owner: user('owner'),
    participants: [
      { userId: 'owner', chatId: 'chat-1', leftAt: null, joinedAt: date },
    ],
    messages: [],
  };

  const catchError = async (
    promise: Promise<unknown>,
  ): Promise<V1ApiException> => {
    const error: unknown = await promise.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(V1ApiException);

    return error as V1ApiException;
  };

  const expectV1Error = async (
    promise: Promise<unknown>,
    status: HttpStatus,
    code: ErrorCode,
    message: string,
  ): Promise<void> => {
    const error = await catchError(promise);

    expect(error.getStatus()).toBe(status);
    expect(error.getResponse()).toEqual({
      status: 'error',
      statusCode: status,
      code,
      message,
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createChatRoom', () => {
    it('should keep the caller, drop unknown invitees and broadcast to members', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'user-2' }]);
      prisma.chat.create.mockResolvedValue(roomRecord);

      const result = await service.createChatRoom('owner', {
        participantsIds: ['owner', 'user-2', 'user-2', 'ghost'],
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-2', 'user-2', 'ghost'] }, deletedAt: null },
        select: { id: true },
      });
      expect(prisma.chat.create.mock.calls[0][0].data).toEqual({
        ownerId: 'owner',
        name: expect.stringMatching(/^Chat \d{4}-\d{2}-\d{2}T/),
        description: '',
        participants: {
          create: [{ userId: 'owner' }, { userId: 'user-2' }],
        },
      });
      expect(result.recipientIds).toEqual(['owner', 'user-2']);
      expect(result.response).toMatchObject({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_CREATED,
        message: 'Chat room created successfully',
        data: { room: { id: 'chat-1', ownerId: 'owner' } },
      });
    });
  });

  describe('getChatRoom', () => {
    it('should answer 404 when the caller is not an active member', async () => {
      prisma.chat.findMany.mockResolvedValue([]);

      await expectV1Error(
        service.getChatRoom('user-1', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Chat room not found',
      );
    });

    it('should list every participant, including those who left', async () => {
      prisma.chat.findMany.mockResolvedValue([roomRecord]);

      const result = await service.getChatRoom('owner', { roomId: 'chat-1' });

      expect(prisma.chat.findMany.mock.calls[0][0].where).toEqual({
        id: 'chat-1',
        deletedAt: null,
        participants: {
          some: { userId: 'owner', leftAt: null, deletedAt: null },
        },
      });
      expect(
        prisma.chat.findMany.mock.calls[0][0].select.participants.where,
      ).toEqual({ deletedAt: null });
      expect(result.code).toBe(SuccessCode.CHAT_ROOM_RETRIEVED);
    });
  });

  describe('getMyChatRooms', () => {
    it('should list only active participants of non-deleted rooms', async () => {
      prisma.chat.findMany.mockResolvedValue([roomRecord]);

      const result = await service.getMyChatRooms('owner', {});

      expect(prisma.chat.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        participants: {
          some: { userId: 'owner', leftAt: null, deletedAt: null },
        },
      });
      expect(
        prisma.chat.findMany.mock.calls[0][0].select.participants.where,
      ).toEqual({ leftAt: null, deletedAt: null });
      expect(result.data.rooms).toHaveLength(1);
      expect(result.message).toBe('Chat rooms retrieved successfully');
    });

    it('should ignore an empty search', async () => {
      prisma.chat.findMany.mockResolvedValue([]);

      await service.getMyChatRooms('owner', { search: '' });

      expect(prisma.chat.findMany.mock.calls[0][0].where).not.toHaveProperty(
        'OR',
      );
    });

    it('should search by chat name or another active participant name', async () => {
      prisma.chat.findMany.mockResolvedValue([roomRecord]);

      await service.getMyChatRooms('owner', { search: 'an' });

      const searchFilter = { contains: 'an', mode: 'insensitive' };

      expect(prisma.chat.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        participants: {
          some: { userId: 'owner', leftAt: null, deletedAt: null },
        },
        OR: [
          { name: searchFilter },
          {
            participants: {
              some: {
                userId: { not: 'owner' },
                leftAt: null,
                deletedAt: null,
                user: { deletedAt: null, name: searchFilter },
              },
            },
          },
        ],
      });
    });
  });

  describe('getMyChatRooms search escaping', () => {
    it('should match LIKE wildcards and backslashes literally', async () => {
      prisma.chat.findMany.mockResolvedValue([]);

      await service.getMyChatRooms('owner', { search: '100%_\\' });

      expect(prisma.chat.findMany.mock.calls[0][0].where.OR[0]).toEqual({
        name: { contains: '100\\%\\_\\\\', mode: 'insensitive' },
      });
    });
  });

  describe('leaveChatRoom', () => {
    const mockRoom = (
      ownerId: string,
      activeIds: string[],
      type: ChatType = ChatType.GROUP,
    ): void => {
      prisma.chat.findFirst.mockResolvedValue({
        ownerId,
        type,
        participants: activeIds.map((userId) => ({ userId })),
      });
    };

    it('should answer 404 when the room does not exist', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.leaveChatRoom('user-1', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-1 not found',
      );
    });

    it('should soft-delete the room when the owner is alone', async () => {
      mockRoom('owner', ['owner']);

      const result = await service.leaveChatRoom('owner', { roomId: 'chat-1' });

      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
        data: { deletedAt: expect.any(Date), directKey: null },
        select: { id: true },
      });
      expect(prisma.chatMembership.update).not.toHaveBeenCalled();
      expect(result.response).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_DELETED,
        message: 'You left the room and it was deleted.',
        data: {
          roomId: 'chat-1',
          userId: 'owner',
          status: 'userQuit',
          roomStatus: 'deleted',
        },
      });
      expect(result.recipientIds).toEqual(['owner']);
    });

    it('should answer 403 with the legacy body when the owner is not alone', async () => {
      mockRoom('owner', ['owner', 'user-2']);

      const error = await catchError(
        service.leaveChatRoom('owner', { roomId: 'chat-1' }),
      );

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.getResponse()).toEqual({
        status: 'error',
        code: ErrorCode.CHAT_ACCESS_DENIED,
        message: 'Room owners must delete the room instead of leaving it.',
        data: { roomId: 'chat-1', userId: 'owner', status: 'userIsOwner' },
      });
      expect(prisma.chat.update).not.toHaveBeenCalled();
    });

    it('should answer 404 when the caller is not an active member', async () => {
      mockRoom('owner', ['owner', 'user-2']);

      await expectV1Error(
        service.leaveChatRoom('user-3', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-1 not found',
      );
    });

    it('should mark the member as left and keep the room', async () => {
      mockRoom('owner', ['owner', 'user-2']);
      prisma.chatMembership.count.mockResolvedValue(1);

      const result = await service.leaveChatRoom('user-2', {
        roomId: 'chat-1',
      });

      expect(prisma.chatMembership.update).toHaveBeenCalledWith({
        where: { userId_chatId: { userId: 'user-2', chatId: 'chat-1' } },
        data: { leftAt: expect.any(Date) },
        select: { id: true },
      });
      expect(prisma.chat.update).not.toHaveBeenCalled();
      expect(result.response).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_USER_REMOVED,
        message: 'You have left the chat room.',
        data: { roomId: 'chat-1', userId: 'user-2', status: 'userQuit' },
      });
      expect(result.recipientIds).toEqual(['owner', 'user-2']);
    });

    it('should soft-delete the room when the last member leaves', async () => {
      mockRoom('owner', ['user-2']);
      prisma.chatMembership.count.mockResolvedValue(0);

      const result = await service.leaveChatRoom('user-2', {
        roomId: 'chat-1',
      });

      expect(prisma.chat.update).toHaveBeenCalled();
      expect(result.response.code).toBe(SuccessCode.CHAT_ROOM_DELETED);
      expect(result.response.data.roomStatus).toBe('deleted');
    });

    it('should let the owner of a direct chat leave while the other side stays', async () => {
      mockRoom('owner', ['owner', 'user-2'], ChatType.DIRECT);
      prisma.chatMembership.count.mockResolvedValue(1);

      const result = await service.leaveChatRoom('owner', { roomId: 'chat-1' });

      expect(prisma.chatMembership.update).toHaveBeenCalledWith({
        where: { userId_chatId: { userId: 'owner', chatId: 'chat-1' } },
        data: { leftAt: expect.any(Date) },
        select: { id: true },
      });
      expect(prisma.chat.update).not.toHaveBeenCalled();
      expect(result.response.code).toBe(SuccessCode.CHAT_USER_REMOVED);
    });

    it('should delete a direct chat and free its pair key when the second side leaves', async () => {
      mockRoom('owner', ['user-2'], ChatType.DIRECT);
      prisma.chatMembership.count.mockResolvedValue(0);

      const result = await service.leaveChatRoom('user-2', {
        roomId: 'chat-1',
      });

      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
        data: { deletedAt: expect.any(Date), directKey: null },
        select: { id: true },
      });
      expect(result.response.code).toBe(SuccessCode.CHAT_ROOM_DELETED);
    });
  });

  describe('getChatMessages', () => {
    it('should answer 404 when the caller is not an active member', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.getChatMessages('user-1', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Chat room with ID chat-1 not found or user user-1 is not a participant.',
      );
    });

    it('should fetch 21 non-deleted messages and nest the page under messages', async () => {
      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });
      prisma.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getChatMessages('user-1', {
        roomId: 'chat-1',
      });

      expect(prisma.chatMessage.findMany.mock.calls[0][0]).toMatchObject({
        where: { chatId: 'chat-1', deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 21,
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_MESSAGES_RETRIEVED,
        message: 'Messages retrieved successfully',
        data: { messages: { messages: [], nextCursor: null } },
      });
    });
  });

  describe('addUserToChatRoom', () => {
    const params = { roomId: 'chat-1', userId: 'user-2' };
    const mockRoom = (
      participants: { userId: string; leftAt: Date | null }[],
      type: ChatType = ChatType.GROUP,
    ): void => {
      prisma.chat.findFirst.mockResolvedValue({
        ownerId: 'owner',
        type,
        participants,
      });
    };

    it('should answer 403 for a direct chat', async () => {
      mockRoom([{ userId: 'owner', leftAt: null }], ChatType.DIRECT);

      await expectV1Error(
        service.addUserToChatRoom('owner', params),
        HttpStatus.FORBIDDEN,
        ErrorCode.CHAT_ACCESS_DENIED,
        'Room chat-1 is a direct chat: members cannot be added or removed.',
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should answer 404 when the room does not exist', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.addUserToChatRoom('owner', params),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-1 not found.',
      );
    });

    it('should answer 403 when the caller is not the owner', async () => {
      mockRoom([]);

      await expectV1Error(
        service.addUserToChatRoom('user-3', params),
        HttpStatus.FORBIDDEN,
        ErrorCode.CHAT_ACCESS_DENIED,
        'User user-3 is not the owner of room chat-1.',
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should answer 404 when the user does not exist', async () => {
      mockRoom([{ userId: 'user-2', leftAt: null }]);
      prisma.user.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.addUserToChatRoom('owner', params),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_USER_NOT_FOUND,
        'User user-2 not found',
      );
    });

    it('should answer 409 when the user is already active', async () => {
      mockRoom([{ userId: 'user-2', leftAt: null }]);
      prisma.user.findFirst.mockResolvedValue(user('user-2'));

      await expectV1Error(
        service.addUserToChatRoom('owner', params),
        HttpStatus.CONFLICT,
        ErrorCode.CHAT_USER_ALREADY_EXISTS,
        'User user-2 is already in the room',
      );
    });

    it('should reactivate a member who left', async () => {
      mockRoom([
        { userId: 'owner', leftAt: null },
        { userId: 'user-2', leftAt: date },
      ]);
      prisma.user.findFirst.mockResolvedValue(user('user-2'));

      const result = await service.addUserToChatRoom('owner', params);

      expect(prisma.chatMembership.update).toHaveBeenCalledWith({
        where: { userId_chatId: { userId: 'user-2', chatId: 'chat-1' } },
        data: { leftAt: null, joinedAt: expect.any(Date) },
        select: { id: true },
      });
      expect(prisma.chatMembership.create).not.toHaveBeenCalled();
      expect(result.response).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_USER_ADDED,
        message: 'User added to chat room',
        data: {
          roomId: 'chat-1',
          user: { id: 'user-2', name: 'name-user-2', siteRole: SiteRole.USER },
          status: 'reactivated',
        },
      });
      expect(result.recipientIds).toEqual(['owner', 'user-2']);
    });

    it('should add a new member', async () => {
      mockRoom([{ userId: 'owner', leftAt: null }]);
      prisma.user.findFirst.mockResolvedValue(user('user-2'));

      const result = await service.addUserToChatRoom('owner', params);

      expect(prisma.chatMembership.create).toHaveBeenCalledWith({
        data: { userId: 'user-2', chatId: 'chat-1' },
        select: { id: true },
      });
      expect(result.response.data.status).toBe('added');
    });

    it('should answer 409 when a concurrent invite wins the race', async () => {
      mockRoom([{ userId: 'owner', leftAt: null }]);
      prisma.user.findFirst.mockResolvedValue(user('user-2'));
      prisma.chatMembership.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expectV1Error(
        service.addUserToChatRoom('owner', params),
        HttpStatus.CONFLICT,
        ErrorCode.CHAT_USER_ALREADY_EXISTS,
        'User user-2 is already in the room',
      );
    });
  });

  describe('removeUserFromChatRoom', () => {
    const params = { roomId: 'chat-1', userId: 'user-2' };

    it('should answer 404 unless the caller owns the room and the user is active', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.removeUserFromChatRoom('owner', params),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room not found or user not a valid participant',
      );
      expect(prisma.chat.findFirst.mock.calls[0][0].where).toEqual({
        id: 'chat-1',
        ownerId: 'owner',
        deletedAt: null,
        participants: {
          some: { userId: 'user-2', leftAt: null, deletedAt: null },
        },
      });
    });

    it('should answer 403 for a direct chat', async () => {
      prisma.chat.findFirst.mockResolvedValue({ type: ChatType.DIRECT });

      await expectV1Error(
        service.removeUserFromChatRoom('owner', params),
        HttpStatus.FORBIDDEN,
        ErrorCode.CHAT_ACCESS_DENIED,
        'Room chat-1 is a direct chat: members cannot be added or removed.',
      );
      expect(prisma.chatMembership.update).not.toHaveBeenCalled();
    });

    it('should mark the member as left', async () => {
      prisma.chat.findFirst.mockResolvedValue({ type: ChatType.GROUP });

      const result = await service.removeUserFromChatRoom('owner', params);

      expect(prisma.chatMembership.update).toHaveBeenCalledWith({
        where: { userId_chatId: { userId: 'user-2', chatId: 'chat-1' } },
        data: { leftAt: expect.any(Date) },
        select: { id: true },
      });
      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_USER_REMOVED,
        message: 'User removed from chat room successfully',
        data: {
          room: { roomId: 'chat-1', userId: 'user-2', status: 'removed' },
        },
      });
    });
  });

  describe('openDirectChat', () => {
    const directKey = 'user-a:user-b';
    const directRoom = {
      ...roomRecord,
      ownerId: 'user-b',
      type: ChatType.DIRECT,
      owner: user('user-b'),
    };

    it('should answer 400 for a chat with yourself', async () => {
      await expectV1Error(
        service.openDirectChat('user-a', { userId: 'user-a' }),
        HttpStatus.BAD_REQUEST,
        ErrorCode.CHAT_DIRECT_SELF,
        'You cannot open a direct chat with yourself.',
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should answer 404 for a missing, deleted or banned user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.openDirectChat('user-a', { userId: 'user-b' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_USER_NOT_FOUND,
        'User user-b not found',
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-b',
          deletedAt: null,
          status: { not: UserStatus.BANNED },
        },
        select: { id: true },
      });
      expect(prisma.chat.create).not.toHaveBeenCalled();
    });

    it('should create the chat with an order-independent pair key', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
      prisma.chat.findUnique.mockResolvedValue(null);
      prisma.chat.create.mockResolvedValue({ id: 'chat-1' });
      prisma.chat.findMany.mockResolvedValue([directRoom]);

      const result = await service.openDirectChat('user-b', {
        userId: 'user-a',
      });

      expect(prisma.chat.findUnique).toHaveBeenCalledWith({
        where: { directKey },
        select: { id: true },
      });
      expect(prisma.chat.create.mock.calls[0][0].data).toEqual({
        ownerId: 'user-b',
        type: ChatType.DIRECT,
        directKey,
        name: expect.stringMatching(/^Chat \d{4}-\d{2}-\d{2}T/),
        description: '',
        participants: { create: [{ userId: 'user-b' }, { userId: 'user-a' }] },
      });
      expect(prisma.chatMembership.updateMany).not.toHaveBeenCalled();
      expect(result.isCreated).toBe(true);
      expect(result.recipientIds).toEqual(['user-b', 'user-a']);
      expect(result.response).toMatchObject({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_CREATED,
        message: 'Chat room created successfully',
        data: { room: { id: 'chat-1', type: ChatType.DIRECT } },
      });
    });

    it('should open the existing chat and bring the caller back', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
      prisma.chat.findUnique.mockResolvedValue({ id: 'chat-1' });
      prisma.chat.findMany.mockResolvedValue([directRoom]);

      const result = await service.openDirectChat('user-a', {
        userId: 'user-b',
      });

      expect(prisma.chat.create).not.toHaveBeenCalled();
      expect(prisma.chatMembership.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-a',
          chat: { directKey },
          leftAt: { not: null },
          deletedAt: null,
        },
        data: { leftAt: null, joinedAt: expect.any(Date) },
      });
      expect(prisma.chat.findMany.mock.calls[0][0].where).toEqual({
        directKey,
        deletedAt: null,
      });
      expect(result.isCreated).toBe(false);
      expect(result.recipientIds).toEqual([]);
      expect(result.response.code).toBe(SuccessCode.CHAT_ROOM_RETRIEVED);
    });

    it('should open the chat a concurrent request created first', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
      prisma.chat.findUnique.mockResolvedValue(null);
      prisma.chat.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.chat.findMany.mockResolvedValue([directRoom]);

      const result = await service.openDirectChat('user-a', {
        userId: 'user-b',
      });

      expect(result.isCreated).toBe(false);
      expect(result.response.code).toBe(SuccessCode.CHAT_ROOM_RETRIEVED);
    });
  });

  describe('reopenDirectChat', () => {
    it('should do nothing when nobody left the direct chat', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([]);

      await expect(service.reopenDirectChat('chat-1')).resolves.toBeNull();
      expect(prisma.chatMembership.findMany).toHaveBeenCalledWith({
        where: {
          chatId: 'chat-1',
          leftAt: { not: null },
          deletedAt: null,
          chat: { type: ChatType.DIRECT, deletedAt: null },
        },
        select: { userId: true },
      });
      expect(prisma.chatMembership.updateMany).not.toHaveBeenCalled();
    });

    it('should bring back the side who left and return the room', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([{ userId: 'user-b' }]);
      prisma.chat.findMany.mockResolvedValue([roomRecord]);

      const result = await service.reopenDirectChat('chat-1');

      expect(prisma.chatMembership.updateMany).toHaveBeenCalledWith({
        where: {
          chatId: 'chat-1',
          userId: { in: ['user-b'] },
          leftAt: { not: null },
        },
        data: { leftAt: null, joinedAt: expect.any(Date) },
      });
      expect(result?.recipientIds).toEqual(['user-b']);
      expect(result?.room.id).toBe('chat-1');
    });
  });
});
