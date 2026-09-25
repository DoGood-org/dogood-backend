import { SiteRole } from '@prisma/client';
import { ChatMessageRecordV1 } from 'src/chat/interfaces/chat';
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
    it('should replace a null name and description with empty strings', () => {
      const room = mapper.toChatRoom({
        id: 'chat-1',
        ownerId: 'user-1',
        name: null,
        description: null,
        createdAt,
        updatedAt: createdAt,
        owner: sender,
        participants: [],
        messages: [messageRecord('message-1')],
      });

      expect(room.name).toBe('');
      expect(room.description).toBe('');
      expect(room.createdAt).toBe('2026-09-25T10:00:00.000Z');
      expect(room.messages).toHaveLength(1);
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
