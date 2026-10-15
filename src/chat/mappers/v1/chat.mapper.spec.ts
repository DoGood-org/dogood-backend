import { SiteRole } from '@prisma/client';
import {
  ChatMembershipRecordV1,
  ChatMessageRecordV1,
  ChatRoomRecordV1,
  ChatUserRecordV1,
} from 'src/chat/interfaces/chat';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';

describe('ChatMapperV1', () => {
  const mapper = new ChatMapperV1();
  const createdAt = new Date('2026-09-25T10:00:00.000Z');
  const sender = {
    id: 'user-1',
    name: 'Ann',
    role: SiteRole.USER,
    userProfile: { avatar: 'a.png' },
  };
  const messageRecord = (id: string): ChatMessageRecordV1 => ({
    id,
    senderId: 'user-1',
    chatId: 'chat-1',
    content: 'hi',
    createdAt,
    updatedAt: createdAt,
    sender,
    reactions: [{ id: 'reaction-1', reaction: ':)', userId: 'user-2' }],
  });

  describe('toChatUser', () => {
    it('should rename role to siteRole and flatten the avatar', () => {
      expect(mapper.toChatUser(sender)).toEqual({
        id: 'user-1',
        name: 'Ann',
        siteRole: SiteRole.USER,
        avatar: 'a.png',
      });
    });

    it('should drop the avatar key when there is no avatar', () => {
      const user = mapper.toChatUser({ ...sender, userProfile: null });

      expect(user).not.toHaveProperty('avatar', expect.anything());
      expect(JSON.parse(JSON.stringify(user))).not.toHaveProperty('avatar');
    });
  });

  describe('toChatParticipant', () => {
    it('should synthesize roomId and wasLeft from the membership', () => {
      const leftAt = new Date('2026-09-25T11:00:00.000Z');

      expect(
        mapper.toChatParticipant({
          userId: 'user-2',
          chatId: 'chat-1',
          leftAt,
          joinedAt: createdAt,
          pinPosition: null,
          user: sender,
        }),
      ).toEqual({
        userId: 'user-2',
        roomId: 'chat-1',
        wasLeft: true,
        leftAt,
        joinedAt: createdAt,
      });
    });

    it('should report an active member as not left', () => {
      expect(
        mapper.toChatParticipant({
          userId: 'user-2',
          chatId: 'chat-1',
          leftAt: null,
          joinedAt: createdAt,
          pinPosition: null,
          user: sender,
        }).wasLeft,
      ).toBe(false);
    });
  });

  describe('toChatMessage', () => {
    it('should map dates to ISO strings and reactions to the legacy keys', () => {
      expect(mapper.toChatMessage(messageRecord('message-1'))).toEqual({
        id: 'message-1',
        senderId: 'user-1',
        sender: {
          id: 'user-1',
          name: 'Ann',
          siteRole: SiteRole.USER,
          avatar: 'a.png',
        },
        roomId: 'chat-1',
        content: 'hi',
        createdAt: '2026-09-25T10:00:00.000Z',
        updatedAt: '2026-09-25T10:00:00.000Z',
        reactions: [
          { reactionId: 'reaction-1', reaction: ':)', userId: 'user-2' },
        ],
      });
    });
  });

  describe('toChatRoom', () => {
    const ANN = {
      id: 'ann',
      name: 'Ann',
      role: SiteRole.USER,
      userProfile: null,
    };
    const BOB = {
      id: 'bob',
      name: 'Bob',
      role: SiteRole.ADMIN,
      userProfile: { avatar: 'bob.png' },
    };
    const aMember = (
      user: ChatUserRecordV1,
      overrides: Partial<ChatMembershipRecordV1> = {},
    ): ChatMembershipRecordV1 => ({
      userId: user.id,
      chatId: 'chat-1',
      leftAt: null,
      joinedAt: createdAt,
      pinPosition: null,
      user,
      ...overrides,
    });
    const aRoom = (
      participants: ChatMembershipRecordV1[],
    ): ChatRoomRecordV1 => ({
      id: 'chat-1',
      lastMessageAt: new Date('2026-09-25T12:00:00.000Z'),
      createdAt,
      updatedAt: createdAt,
      participants,
      messages: [messageRecord('message-1')],
    });

    it('should name the room after the interlocutor, not the viewer', () => {
      const room = aRoom([aMember(ANN), aMember(BOB)]);

      expect(mapper.toChatRoom(room, 'ann').name).toBe('Bob');
      expect(mapper.toChatRoom(room, 'bob').name).toBe('Ann');
    });

    it('should expose the interlocutor as a chat user', () => {
      const room = mapper.toChatRoom(
        aRoom([aMember(ANN), aMember(BOB)]),
        'ann',
      );

      expect(room.interlocutor).toEqual({
        id: 'bob',
        name: 'Bob',
        siteRole: SiteRole.ADMIN,
        avatar: 'bob.png',
      });
    });

    it('should keep naming the room after an interlocutor who left', () => {
      const room = mapper.toChatRoom(
        aRoom([aMember(ANN), aMember(BOB, { leftAt: createdAt })]),
        'ann',
      );

      expect(room.name).toBe('Bob');
      expect(room.interlocutor?.id).toBe('bob');
    });

    it('should fall back to an empty name and no interlocutor when the viewer is alone', () => {
      const room = mapper.toChatRoom(aRoom([aMember(ANN)]), 'ann');

      expect(room.name).toBe('');
      expect(room.interlocutor).toBeNull();
    });

    it.each([
      ['on top', 0, true],
      ['lower down', 3, true],
      ['not at all', null, false],
    ])(
      'should report a room the viewer pinned %s as isPinned=%p',
      (_case: string, pinPosition: number | null, isPinned: boolean) => {
        const room = aRoom([aMember(ANN, { pinPosition }), aMember(BOB)]);

        expect(mapper.toChatRoom(room, 'ann').isPinned).toBe(isPinned);
      },
    );

    it('should ignore the pin of the interlocutor', () => {
      const room = aRoom([aMember(ANN), aMember(BOB, { pinPosition: 0 })]);

      expect(mapper.toChatRoom(room, 'ann').isPinned).toBe(false);
    });

    it('should list every participant, including one who left', () => {
      const room = mapper.toChatRoom(
        aRoom([aMember(ANN), aMember(BOB, { leftAt: createdAt })]),
        'ann',
      );

      expect(
        room.participants.map(({ userId, wasLeft }) => [userId, wasLeft]),
      ).toEqual([
        ['ann', false],
        ['bob', true],
      ]);
    });

    it('should not expose pin positions through the participants', () => {
      const room = mapper.toChatRoom(
        aRoom([aMember(ANN, { pinPosition: 1 }), aMember(BOB)]),
        'ann',
      );

      for (const participant of room.participants) {
        expect(participant).not.toHaveProperty('pinPosition');
      }
    });

    it('should serialize the dates and map the last messages', () => {
      const room = mapper.toChatRoom(
        aRoom([aMember(ANN), aMember(BOB)]),
        'ann',
      );

      expect(room).toMatchObject({
        id: 'chat-1',
        lastMessageAt: '2026-09-25T12:00:00.000Z',
        createdAt: '2026-09-25T10:00:00.000Z',
        updatedAt: '2026-09-25T10:00:00.000Z',
      });
      expect(room.messages.map(({ id }) => id)).toEqual(['message-1']);
    });
  });

  describe('toChatMessagesPage', () => {
    it('should cut the extra row and use its id as the next cursor', () => {
      const page = mapper.toChatMessagesPage(
        [messageRecord('m-1'), messageRecord('m-2'), messageRecord('m-3')],
        2,
      );

      expect(page.messages.map(({ id }) => id)).toEqual(['m-1', 'm-2']);
      expect(page.nextCursor).toBe('m-3');
    });

    it('should return a null cursor on the last page', () => {
      const page = mapper.toChatMessagesPage([messageRecord('m-1')], 2);

      expect(page.messages).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });
  });

  describe('toNewChatMessageEvent', () => {
    it('should build the legacy newMessage payload', () => {
      expect(
        mapper.toNewChatMessageEvent('chat-1', messageRecord('message-1')),
      ).toEqual({
        eventId: 'chat-1',
        messageId: 'message-1',
        content: 'hi',
        timestamp: '2026-09-25T10:00:00.000Z',
        user: {
          id: 'user-1',
          name: 'Ann',
          siteRole: SiteRole.USER,
          avatar: 'a.png',
        },
      });
    });
  });
});
