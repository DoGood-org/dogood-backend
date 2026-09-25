import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  ChatMembershipRecordV1,
  ChatMessageRecordV1,
  ChatMessagesPageV1,
  ChatMessageV1,
  ChatParticipantV1,
  ChatResponseV1,
  ChatRoomRecordV1,
  ChatRoomV1,
  ChatUserRecordV1,
  ChatUserV1,
  NewChatMessageEventV1,
} from 'src/chat/interfaces/chat';

@Injectable()
export class ChatMapperV1 {
  toChatResponse<T>(
    code: SuccessCode,
    message: string,
    data: T,
  ): ChatResponseV1<T> {
    return { status: 'success', code, message, data };
  }

  // NOTE: a null avatar becomes `undefined`, dropping the key from the JSON (legacy `?? undefined`).
  toChatUser(record: ChatUserRecordV1): ChatUserV1 {
    const { id, name, role, userProfile } = record;

    return {
      id,
      name,
      siteRole: role,
      avatar: userProfile?.avatar ?? undefined,
    };
  }

  toChatParticipant(record: ChatMembershipRecordV1): ChatParticipantV1 {
    const { userId, chatId, leftAt, joinedAt } = record;

    return {
      userId,
      roomId: chatId,
      wasLeft: leftAt !== null,
      leftAt,
      joinedAt,
    };
  }

  toChatMessage(record: ChatMessageRecordV1): ChatMessageV1 {
    const { id, senderId, sender, chatId, content, createdAt, updatedAt } =
      record;

    return {
      id,
      senderId,
      sender: this.toChatUser(sender),
      roomId: chatId,
      content,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      reactions: record.reactions.map(
        ({ id: reactionId, reaction, userId }) => ({
          reactionId,
          reaction,
          userId,
        }),
      ),
    };
  }

  toChatRoom(record: ChatRoomRecordV1): ChatRoomV1 {
    const {
      id,
      ownerId,
      name,
      description,
      owner,
      participants,
      messages,
      createdAt,
      updatedAt,
    } = record;

    return {
      id,
      ownerId,
      name: name ?? '',
      description: description ?? '',
      owner: this.toChatUser(owner),
      participants: participants.map((participant) =>
        this.toChatParticipant(participant),
      ),
      messages: messages.map((message) => this.toChatMessage(message)),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }

  // NOTE: `records` holds one row past the page; its id is the cursor of the next page.
  toChatMessagesPage(
    records: ChatMessageRecordV1[],
    limit: number,
  ): ChatMessagesPageV1 {
    const nextRecord = records.at(limit);

    return {
      messages: records
        .slice(0, limit)
        .map((record) => this.toChatMessage(record)),
      nextCursor: nextRecord?.id ?? null,
    };
  }

  toNewChatMessageEvent(
    eventId: string,
    record: ChatMessageRecordV1,
  ): NewChatMessageEventV1 {
    const { id, content, createdAt, sender } = record;

    return {
      eventId,
      messageId: id,
      content,
      timestamp: createdAt.toISOString(),
      user: this.toChatUser(sender),
    };
  }
}
