import { HttpStatus } from '@nestjs/common';
import { Prisma, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import {
  ChatMembershipRecordV1,
  ChatRoomRecordV1,
  ChatUserRecordV1,
} from 'src/chat/interfaces/chat';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';
import { ChatServiceV1 } from 'src/chat/services/v1/chat.service';

const NOW = new Date('2026-10-12T10:00:00.000Z');

const ANN: ChatUserRecordV1 = {
  id: 'ann',
  name: 'Ann',
  role: SiteRole.USER,
  userProfile: null,
};
const BOB: ChatUserRecordV1 = {
  id: 'bob',
  name: 'Bob',
  role: SiteRole.USER,
  userProfile: { avatar: 'bob.png' },
};

const aMember = (
  user: ChatUserRecordV1,
  overrides: Partial<ChatMembershipRecordV1> = {},
): ChatMembershipRecordV1 => ({
  userId: user.id,
  chatId: 'chat-1',
  leftAt: null,
  joinedAt: NOW,
  pinPosition: null,
  user,
  ...overrides,
});

const aRoom = (
  overrides: Partial<ChatRoomRecordV1> = {},
): ChatRoomRecordV1 => ({
  id: 'chat-1',
  lastMessageAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  participants: [aMember(ANN), aMember(BOB)],
  messages: [],
  ...overrides,
});

const expectV1Error = async (
  promise: Promise<unknown>,
  status: HttpStatus,
  code: ErrorCode,
  message: string,
): Promise<void> => {
  const error: unknown = await promise.catch((e: unknown) => e);

  expect(error).toBeInstanceOf(V1ApiException);
  expect((error as V1ApiException).getStatus()).toBe(status);
  expect((error as V1ApiException).getResponse()).toEqual({
    status: 'error',
    statusCode: status,
    code,
    message,
  });
};

const uniqueConstraintViolation = (): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('ChatServiceV1', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    chat: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatMembership: {
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getChatRoom', () => {
    it('should answer 404 when the caller is not an active member of a live room', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.getChatRoom('ann', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Chat room not found',
      );
      expect(prisma.chat.findFirst.mock.calls[0][0].where).toEqual({
        id: 'chat-1',
        deletedAt: null,
        participants: {
          some: { userId: 'ann', leftAt: null, deletedAt: null },
        },
      });
    });

    it('should describe the room from the caller side', async () => {
      prisma.chat.findFirst.mockResolvedValue(
        aRoom({
          participants: [aMember(ANN, { pinPosition: 0 }), aMember(BOB)],
        }),
      );

      const result = await service.getChatRoom('ann', { roomId: 'chat-1' });

      expect(result).toMatchObject({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_RETRIEVED,
        message: 'Chat room retrieved successfully',
        data: {
          room: {
            id: 'chat-1',
            name: 'Bob',
            interlocutor: { id: 'bob', name: 'Bob', avatar: 'bob.png' },
            isPinned: true,
          },
        },
      });
    });
  });

  describe('getMyChatRooms', () => {
    const lastQuery = (): {
      where: Prisma.ChatMembershipWhereInput;
      orderBy: unknown;
      select: { chat: { select: { participants: { where: unknown } } } };
    } => prisma.chatMembership.findMany.mock.calls[0][0];

    beforeEach(() => {
      prisma.chatMembership.findMany.mockResolvedValue([]);
    });

    it('should list only live memberships of the caller in live rooms', async () => {
      await service.getMyChatRooms('ann', {});

      expect(lastQuery().where).toEqual({
        userId: 'ann',
        leftAt: null,
        deletedAt: null,
        chat: { deletedAt: null },
      });
    });

    it('should put pinned rooms first in pin order, then the rest by the newest message', async () => {
      await service.getMyChatRooms('ann', {});

      expect(lastQuery().orderBy).toEqual([
        { pinPosition: { sort: 'asc', nulls: 'last' } },
        { chat: { lastMessageAt: 'desc' } },
        { chatId: 'asc' },
      ]);
    });

    it('should load every member, including one who left, so the interlocutor is always known', async () => {
      await service.getMyChatRooms('ann', {});

      expect(lastQuery().select.chat.select.participants.where).toEqual({
        deletedAt: null,
      });
    });

    it('should keep the database order and describe every room from the caller side', async () => {
      const roomWithBob = aRoom({ id: 'chat-bob' });
      const roomWithCid = aRoom({
        id: 'chat-cid',
        participants: [
          aMember(ANN, { chatId: 'chat-cid' }),
          aMember(
            { ...BOB, id: 'cid', name: 'Cid' },
            { chatId: 'chat-cid' },
          ),
        ],
      });

      prisma.chatMembership.findMany.mockResolvedValue([
        { chat: roomWithCid },
        { chat: roomWithBob },
      ]);

      const result = await service.getMyChatRooms('ann', {});

      expect(result.code).toBe(SuccessCode.CHAT_ROOMS_RETRIEVED);
      expect(result.message).toBe('Chat rooms retrieved successfully');
      expect(result.data.rooms.map(({ id, name }) => [id, name])).toEqual([
        ['chat-cid', 'Cid'],
        ['chat-bob', 'Bob'],
      ]);
    });

    it.each([undefined, ''])(
      'should not filter by name when search is %p',
      async (search: string | undefined) => {
        await service.getMyChatRooms('ann', { search });

        expect(lastQuery().where.chat).toEqual({ deletedAt: null });
      },
    );

    it('should match the interlocutor name case-insensitively, even after they left, never the caller', async () => {
      await service.getMyChatRooms('ann', { search: 'bo' });

      expect(lastQuery().where.chat).toEqual({
        deletedAt: null,
        participants: {
          some: {
            userId: { not: 'ann' },
            deletedAt: null,
            user: { name: { contains: 'bo', mode: 'insensitive' } },
          },
        },
      });
    });

    it.each([
      ['a percent sign', '100%', '100\\%'],
      ['an underscore', 'a_b', 'a\\_b'],
      ['a backslash', 'a\\b', 'a\\\\b'],
    ])(
      'should match %s literally instead of as a LIKE wildcard',
      async (_case: string, search: string, escaped: string) => {
        await service.getMyChatRooms('ann', { search });

        expect(lastQuery().where).toMatchObject({
          chat: {
            participants: {
              some: { user: { name: { contains: escaped } } },
            },
          },
        });
      },
    );
  });

  describe('leaveChatRoom', () => {
    const givenActiveMembers = (...userIds: string[]): void => {
      prisma.chat.findFirst.mockResolvedValue({
        participants: userIds.map((userId) => ({ userId })),
      });
    };

    it('should answer 404 when the room does not exist', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.leaveChatRoom('ann', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-1 not found',
      );
      expect(prisma.chatMembership.update).not.toHaveBeenCalled();
    });

    it('should answer 404 when the caller has already left or never joined', async () => {
      givenActiveMembers('bob');

      await expectV1Error(
        service.leaveChatRoom('ann', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-1 not found',
      );
      expect(prisma.chatMembership.update).not.toHaveBeenCalled();
    });

    it('should mark the caller as left and free their pin slot', async () => {
      givenActiveMembers('ann', 'bob');
      prisma.chatMembership.count.mockResolvedValue(1);

      await service.leaveChatRoom('ann', { roomId: 'chat-1' });

      expect(prisma.chatMembership.update).toHaveBeenCalledWith({
        where: { userId_chatId: { userId: 'ann', chatId: 'chat-1' } },
        data: { leftAt: expect.any(Date), pinPosition: null },
        select: { id: true },
      });
    });

    it('should keep the room for the side who stays and notify both sides', async () => {
      givenActiveMembers('ann', 'bob');
      prisma.chatMembership.count.mockResolvedValue(1);

      const result = await service.leaveChatRoom('ann', { roomId: 'chat-1' });

      expect(prisma.chat.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        response: {
          status: 'success',
          code: SuccessCode.CHAT_USER_REMOVED,
          message: 'You have left the chat room.',
          data: { roomId: 'chat-1', userId: 'ann', status: 'userQuit' },
        },
        recipientIds: ['ann', 'bob'],
      });
    });

    it('should delete the room and free the pair key once the second side leaves', async () => {
      givenActiveMembers('bob');
      prisma.chatMembership.count.mockResolvedValue(0);

      const result = await service.leaveChatRoom('bob', { roomId: 'chat-1' });

      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
        data: { deletedAt: expect.any(Date), directKey: null },
        select: { id: true },
      });
      expect(result).toEqual({
        response: {
          status: 'success',
          code: SuccessCode.CHAT_ROOM_DELETED,
          message: 'You left the room and it was deleted.',
          data: {
            roomId: 'chat-1',
            userId: 'bob',
            status: 'userQuit',
            roomStatus: 'deleted',
          },
        },
        recipientIds: ['bob'],
      });
    });
  });

  describe('getChatMessages', () => {
    it('should answer 404 when the caller is not an active member', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);

      await expectV1Error(
        service.getChatMessages('ann', { roomId: 'chat-1' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Chat room with ID chat-1 not found or user ann is not a participant.',
      );
      expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
    });

    it('should serve the newest page of live messages', async () => {
      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1' });
      prisma.chatMessage.findMany.mockResolvedValue([]);

      const result = await service.getChatMessages('ann', { roomId: 'chat-1' });

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

  describe('openDirectChat', () => {
    const givenInterlocutorExists = (): void => {
      prisma.user.findFirst.mockResolvedValue({ id: 'bob' });
    };

    describe('rejects', () => {
      it('should answer 400 for a chat with yourself, before touching the database', async () => {
        await expectV1Error(
          service.openDirectChat('ann', { userId: 'ann' }),
          HttpStatus.BAD_REQUEST,
          ErrorCode.CHAT_DIRECT_SELF,
          'You cannot open a direct chat with yourself.',
        );
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
      });

      it('should answer 404 for a missing, deleted or banned interlocutor', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expectV1Error(
          service.openDirectChat('ann', { userId: 'bob' }),
          HttpStatus.NOT_FOUND,
          ErrorCode.CHAT_USER_NOT_FOUND,
          'User bob not found',
        );
        expect(prisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'bob',
            deletedAt: null,
            status: { not: UserStatus.BANNED },
          },
          select: { id: true },
        });
        expect(prisma.chat.create).not.toHaveBeenCalled();
      });

      it('should answer 404 when the room is gone right after opening it', async () => {
        givenInterlocutorExists();
        prisma.chat.findUnique.mockResolvedValue({ id: 'chat-1' });
        prisma.chat.findFirst.mockResolvedValue(null);

        await expectV1Error(
          service.openDirectChat('ann', { userId: 'bob' }),
          HttpStatus.NOT_FOUND,
          ErrorCode.CHAT_ROOM_NOT_FOUND,
          'Chat room not found',
        );
      });
    });

    it.each([
      ['ann', 'bob'],
      ['bob', 'ann'],
    ])(
      'should key the pair the same way whoever opens it (%s → %s)',
      async (callerId: string, userId: string) => {
        prisma.user.findFirst.mockResolvedValue({ id: userId });
        prisma.chat.findUnique.mockResolvedValue({ id: 'chat-1' });
        prisma.chat.findFirst.mockResolvedValue(aRoom());

        await service.openDirectChat(callerId, { userId });

        expect(prisma.chat.findUnique).toHaveBeenCalledWith({
          where: { directKey: 'ann:bob' },
          select: { id: true },
        });
      },
    );

    describe('when the pair has no chat yet', () => {
      beforeEach(() => {
        givenInterlocutorExists();
        prisma.chat.findUnique.mockResolvedValue(null);
        prisma.chat.create.mockResolvedValue({ id: 'chat-1' });
        prisma.chat.findFirst.mockResolvedValue(aRoom());
      });

      it('should create a chat of exactly the two of them', async () => {
        await service.openDirectChat('ann', { userId: 'bob' });

        expect(prisma.chat.create.mock.calls[0][0].data).toEqual({
          directKey: 'ann:bob',
          participants: { create: [{ userId: 'ann' }, { userId: 'bob' }] },
        });
        expect(prisma.chatMembership.updateMany).not.toHaveBeenCalled();
      });

      it('should answer "created" with the room seen by the caller', async () => {
        const result = await service.openDirectChat('ann', { userId: 'bob' });

        expect(result.isCreated).toBe(true);
        expect(result.response).toMatchObject({
          status: 'success',
          code: SuccessCode.CHAT_ROOM_CREATED,
          message: 'Chat room created successfully',
          data: { room: { id: 'chat-1', name: 'Bob' } },
        });
      });

      it('should deliver the new room to both sides, each seeing the other', async () => {
        const result = await service.openDirectChat('ann', { userId: 'bob' });

        expect(
          result.deliveries.map(({ recipientId, room }) => [
            recipientId,
            room.name,
          ]),
        ).toEqual([
          ['ann', 'Bob'],
          ['bob', 'Ann'],
        ]);
      });
    });

    describe('when the pair already has a chat', () => {
      beforeEach(() => {
        givenInterlocutorExists();
        prisma.chat.findUnique.mockResolvedValue({ id: 'chat-1' });
        prisma.chat.findFirst.mockResolvedValue(aRoom());
      });

      it('should bring the caller back if they had left, and nobody else', async () => {
        await service.openDirectChat('ann', { userId: 'bob' });

        expect(prisma.chat.create).not.toHaveBeenCalled();
        expect(prisma.chatMembership.updateMany).toHaveBeenCalledWith({
          where: {
            userId: 'ann',
            chat: { directKey: 'ann:bob' },
            leftAt: { not: null },
            deletedAt: null,
          },
          data: { leftAt: null, joinedAt: expect.any(Date) },
        });
      });

      it('should answer "retrieved" and deliver nothing', async () => {
        const result = await service.openDirectChat('ann', { userId: 'bob' });

        expect(prisma.chat.findFirst.mock.calls[0][0].where).toEqual({
          directKey: 'ann:bob',
          deletedAt: null,
        });
        expect(result.isCreated).toBe(false);
        expect(result.deliveries).toEqual([]);
        expect(result.response).toMatchObject({
          code: SuccessCode.CHAT_ROOM_RETRIEVED,
          message: 'Chat room retrieved successfully',
          data: { room: { name: 'Bob' } },
        });
      });
    });

    describe('when a concurrent request creates the chat first', () => {
      beforeEach(() => {
        givenInterlocutorExists();
        prisma.chat.findUnique.mockResolvedValue(null);
        prisma.chat.findFirst.mockResolvedValue(aRoom());
      });

      it('should open the chat the other request created', async () => {
        prisma.chat.create.mockRejectedValue(uniqueConstraintViolation());

        const result = await service.openDirectChat('ann', { userId: 'bob' });

        expect(result.isCreated).toBe(false);
        expect(result.deliveries).toEqual([]);
        expect(result.response.code).toBe(SuccessCode.CHAT_ROOM_RETRIEVED);
      });

      it('should not swallow any other database error', async () => {
        const failure = new Error('connection lost');

        prisma.chat.create.mockRejectedValue(failure);

        await expect(
          service.openDirectChat('ann', { userId: 'bob' }),
        ).rejects.toBe(failure);
      });
    });
  });

  describe('reopenDirectChat', () => {
    it('should change and deliver nothing when nobody has left the room', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([]);

      await expect(service.reopenDirectChat('chat-1')).resolves.toEqual([]);
      expect(prisma.chatMembership.findMany).toHaveBeenCalledWith({
        where: {
          chatId: 'chat-1',
          leftAt: { not: null },
          deletedAt: null,
          chat: { deletedAt: null },
        },
        select: { userId: true },
      });
      expect(prisma.chatMembership.updateMany).not.toHaveBeenCalled();
    });

    it('should bring back the side who left', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([{ userId: 'bob' }]);
      prisma.chat.findFirst.mockResolvedValue(aRoom());

      await service.reopenDirectChat('chat-1');

      expect(prisma.chatMembership.updateMany).toHaveBeenCalledWith({
        where: {
          chatId: 'chat-1',
          userId: { in: ['bob'] },
          leftAt: { not: null },
        },
        data: { leftAt: null, joinedAt: expect.any(Date) },
      });
    });

    it('should deliver the room only to the side who came back, seen from their side', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([{ userId: 'bob' }]);
      prisma.chat.findFirst.mockResolvedValue(aRoom());

      const deliveries = await service.reopenDirectChat('chat-1');

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].recipientId).toBe('bob');
      expect(deliveries[0].room).toMatchObject({ id: 'chat-1', name: 'Ann' });
    });

    it('should deliver nothing when the room is gone after the reactivation', async () => {
      prisma.chatMembership.findMany.mockResolvedValue([{ userId: 'bob' }]);
      prisma.chat.findFirst.mockResolvedValue(null);

      await expect(service.reopenDirectChat('chat-1')).resolves.toEqual([]);
    });
  });
});

interface FakeMembershipRow {
  userId: string;
  chatId: string;
  pinPosition: number | null;
  hasLeft: boolean;
  isChatDeleted: boolean;
}

interface FakeMembershipWhere {
  userId?: string;
  chatId?: string;
  pinPosition?: { not: null };
  leftAt?: null;
  deletedAt?: null;
  chat?: { deletedAt: null };
}

interface FakeMembershipUpdate {
  where: { userId_chatId: { userId: string; chatId: string } };
  data: { pinPosition: number | null };
}

const PIN_ORDER = JSON.stringify([{ pinPosition: 'asc' }, { chatId: 'asc' }]);
const LOCK_PREFIX = 'chat-pins:';
const SUPPORTED_FILTERS = new Set([
  'userId',
  'chatId',
  'pinPosition',
  'leftAt',
  'deletedAt',
  'chat',
]);

const byPinOrder = (
  left: FakeMembershipRow,
  right: FakeMembershipRow,
): number =>
  (left.pinPosition ?? Infinity) - (right.pinPosition ?? Infinity) ||
  left.chatId.localeCompare(right.chatId);

// NOTE: an in-memory stand-in for the membership table that answers the pin queries the way Postgres would.
// It refuses any read or write of a user's pins outside a transaction holding that user's advisory lock,
// so every test below also proves the service never races itself past the pin limit.
class FakeChatPinStore {
  readonly journal: string[] = [];
  private readonly rows: FakeMembershipRow[] = [];
  private readonly lockedUserIds = new Set<string>();
  private isInTransaction = false;

  readonly prisma = {
    $transaction: async <T>(
      work: (tx: unknown) => Promise<T>,
    ): Promise<T> => {
      this.isInTransaction = true;
      this.journal.push('BEGIN');

      try {
        const result = await work(this.transactionClient());

        this.journal.push('COMMIT');

        return result;
      } catch (error) {
        this.journal.push('ROLLBACK');

        throw error;
      } finally {
        this.isInTransaction = false;
        this.lockedUserIds.clear();
      }
    },
    $executeRaw: (
      query: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<number> => {
      const [lockKey] = values;

      if (!this.isInTransaction) {
        throw new Error('FakeChatPinStore: a lock outside a transaction');
      }

      if (
        query.join('?') !== 'SELECT pg_advisory_xact_lock(hashtext(?))' ||
        typeof lockKey !== 'string' ||
        !lockKey.startsWith(LOCK_PREFIX)
      ) {
        throw new Error(`FakeChatPinStore: unexpected SQL ${query.join('?')}`);
      }

      this.lockedUserIds.add(lockKey.slice(LOCK_PREFIX.length));
      this.journal.push(`LOCK ${lockKey}`);

      return Promise.resolve(1);
    },
    chatMembership: {
      findMany: (args: {
        where: FakeMembershipWhere;
        orderBy: unknown;
        select: { chatId: true };
      }): Promise<{ chatId: string }[]> => {
        const { where, orderBy } = args;

        this.ensureLocked(where.userId);

        if (JSON.stringify(orderBy) !== PIN_ORDER) {
          throw new Error(
            `FakeChatPinStore: unsupported order ${JSON.stringify(orderBy)}`,
          );
        }

        this.journal.push(`READ pins of ${where.userId}`);

        return Promise.resolve(
          this.rows
            .filter((row) => this.matches(row, where))
            .sort(byPinOrder)
            .map(({ chatId }) => ({ chatId })),
        );
      },
      findFirst: (args: {
        where: FakeMembershipWhere;
      }): Promise<{ id: string } | null> => {
        const { where } = args;

        this.ensureLocked(where.userId);

        const row = this.rows.find((candidate) =>
          this.matches(candidate, where),
        );

        return Promise.resolve(
          row ? { id: `${row.userId}/${row.chatId}` } : null,
        );
      },
      update: (args: FakeMembershipUpdate): Promise<{ id: string }> => {
        const { userId, chatId } = args.where.userId_chatId;
        const { pinPosition } = args.data;

        this.ensureLocked(userId);

        const row = this.rows.find(
          (candidate) =>
            candidate.userId === userId && candidate.chatId === chatId,
        );

        if (!row) {
          throw new Error(
            `FakeChatPinStore: no membership ${userId}/${chatId}`,
          );
        }

        row.pinPosition = pinPosition;
        this.journal.push(`WRITE ${userId}/${chatId} = ${String(pinPosition)}`);

        return Promise.resolve({ id: `${userId}/${chatId}` });
      },
    },
  };

  addMembership(
    row: Pick<FakeMembershipRow, 'userId' | 'chatId'> &
      Partial<FakeMembershipRow>,
  ): this {
    this.rows.push({
      pinPosition: null,
      hasLeft: false,
      isChatDeleted: false,
      ...row,
    });

    return this;
  }

  // NOTE: what the user sees as pinned: live memberships only, in pin order.
  pinnedChatIdsOf(userId: string): string[] {
    return this.livePinnedRowsOf(userId).map(({ chatId }) => chatId);
  }

  pinPositionsOf(userId: string): number[] {
    return this.livePinnedRowsOf(userId).map(
      ({ pinPosition }) => pinPosition ?? -1,
    );
  }

  writes(): string[] {
    return this.journal.filter((entry) => entry.startsWith('WRITE'));
  }

  private livePinnedRowsOf(userId: string): FakeMembershipRow[] {
    return this.rows
      .filter(
        (row) =>
          row.userId === userId &&
          row.pinPosition !== null &&
          !row.hasLeft &&
          !row.isChatDeleted,
      )
      .sort(byPinOrder);
  }

  private transactionClient(): unknown {
    return this.prisma;
  }

  private ensureLocked(userId: string | undefined): void {
    if (
      !this.isInTransaction ||
      userId === undefined ||
      !this.lockedUserIds.has(userId)
    ) {
      throw new Error(
        `FakeChatPinStore: pins of ${String(userId)} touched without the lock`,
      );
    }
  }

  private matches(row: FakeMembershipRow, where: FakeMembershipWhere): boolean {
    const unsupported = Object.keys(where).filter(
      (key) => !SUPPORTED_FILTERS.has(key),
    );

    if (unsupported.length > 0) {
      throw new Error(
        `FakeChatPinStore: unsupported filter ${unsupported.join()}`,
      );
    }

    return (
      (where.userId === undefined || row.userId === where.userId) &&
      (where.chatId === undefined || row.chatId === where.chatId) &&
      (where.pinPosition === undefined || row.pinPosition !== null) &&
      (where.leftAt === undefined || !row.hasLeft) &&
      (where.chat === undefined || !row.isChatDeleted)
    );
  }
}

describe('ChatServiceV1 pins', () => {
  let store: FakeChatPinStore;
  let service: ChatServiceV1;

  const givenAnnPinned = (...chatIds: string[]): void => {
    for (const [pinPosition, chatId] of chatIds.entries()) {
      store.addMembership({ userId: 'ann', chatId, pinPosition });
    }
  };

  const givenAnnIsIn = (...chatIds: string[]): void => {
    for (const chatId of chatIds) {
      store.addMembership({ userId: 'ann', chatId });
    }
  };

  beforeEach(() => {
    store = new FakeChatPinStore();
    service = new ChatServiceV1(
      store.prisma as unknown as PrismaService,
      new ChatMapperV1(),
    );
  });

  describe('every pin operation', () => {
    it.each([
      [
        'pin',
        (): Promise<unknown> =>
          service.pinChatRoom('ann', { roomId: 'chat-c' }),
      ],
      [
        'unpin',
        (): Promise<unknown> =>
          service.unpinChatRoom('ann', { roomId: 'chat-a' }),
      ],
      [
        'reorder',
        (): Promise<unknown> =>
          service.reorderPinnedChatRooms('ann', {
            roomIds: ['chat-b', 'chat-a'],
          }),
      ],
    ])(
      'should %s inside one transaction that first takes the caller lock',
      async (_operation: string, run: () => Promise<unknown>) => {
        givenAnnPinned('chat-a', 'chat-b');
        givenAnnIsIn('chat-c');

        await run();

        expect(store.journal.slice(0, 3)).toEqual([
          'BEGIN',
          'LOCK chat-pins:ann',
          'READ pins of ann',
        ]);
        expect(store.journal.at(-1)).toBe('COMMIT');
      },
    );
  });

  describe('pinChatRoom', () => {
    it('should pin the first room', async () => {
      givenAnnIsIn('chat-a');

      const result = await service.pinChatRoom('ann', { roomId: 'chat-a' });

      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_PINNED,
        message: 'Chat room pinned successfully',
        data: { pinnedRoomIds: ['chat-a'] },
      });
    });

    it('should put a newly pinned room on top of the others', async () => {
      givenAnnPinned('chat-a', 'chat-b');
      givenAnnIsIn('chat-c');

      const result = await service.pinChatRoom('ann', { roomId: 'chat-c' });

      expect(result.data.pinnedRoomIds).toEqual([
        'chat-c',
        'chat-a',
        'chat-b',
      ]);
      expect(store.pinPositionsOf('ann')).toEqual([0, 1, 2]);
    });

    it('should leave the order alone when the room is already pinned', async () => {
      givenAnnPinned('chat-a', 'chat-b');

      const result = await service.pinChatRoom('ann', { roomId: 'chat-b' });

      expect(result.data.pinnedRoomIds).toEqual(['chat-a', 'chat-b']);
      expect(store.writes()).toEqual([]);
    });

    it('should accept the fifth pin', async () => {
      givenAnnPinned('chat-1', 'chat-2', 'chat-3', 'chat-4');
      givenAnnIsIn('chat-5');

      const result = await service.pinChatRoom('ann', { roomId: 'chat-5' });

      expect(result.data.pinnedRoomIds).toHaveLength(5);
    });

    it('should answer 409 to the sixth pin and change nothing', async () => {
      givenAnnPinned('chat-1', 'chat-2', 'chat-3', 'chat-4', 'chat-5');
      givenAnnIsIn('chat-6');

      await expectV1Error(
        service.pinChatRoom('ann', { roomId: 'chat-6' }),
        HttpStatus.CONFLICT,
        ErrorCode.CHAT_PIN_LIMIT_REACHED,
        'You can pin at most 5 chats.',
      );
      expect(store.writes()).toEqual([]);
      expect(store.pinnedChatIdsOf('ann')).toEqual([
        'chat-1',
        'chat-2',
        'chat-3',
        'chat-4',
        'chat-5',
      ]);
    });

    it.each([
      ['a room the caller has left', { hasLeft: true }],
      ['a deleted room', { isChatDeleted: true }],
    ])(
      'should not let a pin left on %s take a slot',
      async (_case: string, staleness: Partial<FakeMembershipRow>) => {
        givenAnnPinned('chat-1', 'chat-2', 'chat-3', 'chat-4');
        store.addMembership({
          userId: 'ann',
          chatId: 'chat-stale',
          pinPosition: 4,
          ...staleness,
        });
        givenAnnIsIn('chat-5');

        const result = await service.pinChatRoom('ann', { roomId: 'chat-5' });

        expect(result.data.pinnedRoomIds).toEqual([
          'chat-5',
          'chat-1',
          'chat-2',
          'chat-3',
          'chat-4',
        ]);
      },
    );

    it('should answer 404 for a room the caller is not a member of', async () => {
      store.addMembership({ userId: 'bob', chatId: 'chat-x' });

      await expectV1Error(
        service.pinChatRoom('ann', { roomId: 'chat-x' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-x not found',
      );
    });

    it.each([
      ['the caller has left', { hasLeft: true }],
      ['that is deleted', { isChatDeleted: true }],
    ])(
      'should answer 404 for a room %s',
      async (_case: string, membership: Partial<FakeMembershipRow>) => {
        store.addMembership({ userId: 'ann', chatId: 'chat-x', ...membership });

        await expectV1Error(
          service.pinChatRoom('ann', { roomId: 'chat-x' }),
          HttpStatus.NOT_FOUND,
          ErrorCode.CHAT_ROOM_NOT_FOUND,
          'Room chat-x not found',
        );
        expect(store.writes()).toEqual([]);
      },
    );

    it('should not touch the pins of the interlocutor in the same room', async () => {
      givenAnnIsIn('chat-a');
      store.addMembership({ userId: 'bob', chatId: 'chat-a', pinPosition: 0 });
      store.addMembership({ userId: 'bob', chatId: 'chat-b', pinPosition: 1 });

      await service.pinChatRoom('ann', { roomId: 'chat-a' });

      expect(store.writes()).toEqual(['WRITE ann/chat-a = 0']);
    });
  });

  describe('unpinChatRoom', () => {
    it('should unpin the room and close the gap it leaves', async () => {
      givenAnnPinned('chat-a', 'chat-b', 'chat-c');

      const result = await service.unpinChatRoom('ann', { roomId: 'chat-b' });

      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_ROOM_UNPINNED,
        message: 'Chat room unpinned successfully',
        data: { pinnedRoomIds: ['chat-a', 'chat-c'] },
      });
      expect(store.pinPositionsOf('ann')).toEqual([0, 1]);
    });

    it('should unpin the last pinned room', async () => {
      givenAnnPinned('chat-a');

      const result = await service.unpinChatRoom('ann', { roomId: 'chat-a' });

      expect(result.data.pinnedRoomIds).toEqual([]);
    });

    it('should change nothing for a room that is not pinned', async () => {
      givenAnnPinned('chat-a');
      givenAnnIsIn('chat-b');

      const result = await service.unpinChatRoom('ann', { roomId: 'chat-b' });

      expect(result.data.pinnedRoomIds).toEqual(['chat-a']);
      expect(store.writes()).toEqual([]);
    });

    it('should answer 404 for a room the caller is not a member of', async () => {
      await expectV1Error(
        service.unpinChatRoom('ann', { roomId: 'chat-x' }),
        HttpStatus.NOT_FOUND,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
        'Room chat-x not found',
      );
    });
  });

  describe('reorderPinnedChatRooms', () => {
    it('should store the order the caller chose', async () => {
      givenAnnPinned('chat-a', 'chat-b', 'chat-c');

      const result = await service.reorderPinnedChatRooms('ann', {
        roomIds: ['chat-c', 'chat-a', 'chat-b'],
      });

      expect(result).toEqual({
        status: 'success',
        code: SuccessCode.CHAT_PINNED_ROOMS_REORDERED,
        message: 'Pinned chat rooms reordered successfully',
        data: { pinnedRoomIds: ['chat-c', 'chat-a', 'chat-b'] },
      });
      expect(store.pinnedChatIdsOf('ann')).toEqual([
        'chat-c',
        'chat-a',
        'chat-b',
      ]);
      expect(store.pinPositionsOf('ann')).toEqual([0, 1, 2]);
    });

    it('should accept an empty order when nothing is pinned', async () => {
      givenAnnIsIn('chat-a');

      const result = await service.reorderPinnedChatRooms('ann', {
        roomIds: [],
      });

      expect(result.data.pinnedRoomIds).toEqual([]);
    });

    it('should not ask for a pin left on a room the caller has left', async () => {
      givenAnnPinned('chat-a', 'chat-b');
      store.addMembership({
        userId: 'ann',
        chatId: 'chat-left',
        pinPosition: 2,
        hasLeft: true,
      });

      const result = await service.reorderPinnedChatRooms('ann', {
        roomIds: ['chat-b', 'chat-a'],
      });

      expect(result.data.pinnedRoomIds).toEqual(['chat-b', 'chat-a']);
    });

    it.each([
      ['misses a pinned room', ['chat-a']],
      ['names a room that is not pinned', ['chat-a', 'chat-x']],
      ['adds a room to the pinned ones', ['chat-a', 'chat-b', 'chat-x']],
      ['names a stale pin', ['chat-a', 'chat-b', 'chat-left']],
      ['repeats a room in place of another', ['chat-a', 'chat-a']],
    ])(
      'should answer 400 and change nothing when the order %s',
      async (_case: string, roomIds: string[]) => {
        givenAnnPinned('chat-a', 'chat-b');
        store.addMembership({
          userId: 'ann',
          chatId: 'chat-left',
          pinPosition: 2,
          hasLeft: true,
        });

        await expectV1Error(
          service.reorderPinnedChatRooms('ann', { roomIds }),
          HttpStatus.BAD_REQUEST,
          ErrorCode.CHAT_PIN_ORDER_INVALID,
          'Room IDs must match the pinned chats exactly.',
        );
        expect(store.writes()).toEqual([]);
        expect(store.pinnedChatIdsOf('ann')).toEqual(['chat-a', 'chat-b']);
      },
    );
  });
});
