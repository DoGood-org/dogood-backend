import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import {
  CHAT_PINNED_ROOMS_LIMIT,
  ChatBroadcastResultV1,
  ChatMessagesDataV1,
  ChatPinnedRoomsResultV1,
  ChatResponseV1,
  ChatRoomDataV1,
  ChatRoomDeliveryV1,
  ChatRoomLeaveResultV1,
  ChatRoomParamsV1,
  ChatRoomRecordV1,
  ChatRoomsDataV1,
  ChatRoomsParamsV1,
  OpenDirectChatDataV1,
  OpenDirectChatResultV1,
  ReorderPinnedChatRoomsDataV1,
} from 'src/chat/interfaces/chat';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';

const CHAT_MESSAGES_PAGE_LIMIT = 20;

@Injectable()
export class ChatServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatMapper: ChatMapperV1,
  ) {}

  async getChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatResponseV1<ChatRoomDataV1>> {
    const { roomId } = params;

    const room = await this.findChatRoom({
      id: roomId,
      deletedAt: null,
      participants: { some: { userId, leftAt: null, deletedAt: null } },
    });

    if (!room) {
      throw this.roomNotFound('Chat room not found');
    }

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOM_RETRIEVED,
      'Chat room retrieved successfully',
      { room: this.chatMapper.toChatRoom(room, userId) },
    );
  }

  // NOTE: pinned rooms first in the caller's order, then the rest by the last message; `search` matches the
  // interlocutor's name, including one who left the chat.
  async getMyChatRooms(
    userId: string,
    params: ChatRoomsParamsV1,
  ): Promise<ChatResponseV1<ChatRoomsDataV1>> {
    const { search } = params;

    const memberships = await this.prisma.chatMembership.findMany({
      where: {
        userId,
        leftAt: null,
        deletedAt: null,
        chat: {
          deletedAt: null,
          ...(search && {
            participants: {
              some: {
                userId: { not: userId },
                deletedAt: null,
                user: {
                  name: {
                    // NOTE: Prisma passes `contains` into LIKE as is, so `%`, `_` and `\` are escaped to match literally.
                    contains: search.replace(/[\\%_]/g, '\\$&'),
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          }),
        },
      },
      orderBy: [
        {
          pinPosition: {
            sort: Prisma.SortOrder.asc,
            nulls: Prisma.NullsOrder.last,
          },
        },
        { chat: { lastMessageAt: Prisma.SortOrder.desc } },
        { chatId: Prisma.SortOrder.asc },
      ],
      select: {
        chat: {
          select: {
            id: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
            participants: {
              where: { deletedAt: null },
              select: {
                userId: true,
                chatId: true,
                leftAt: true,
                joinedAt: true,
                pinPosition: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    userProfile: { select: { avatar: true } },
                  },
                },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: [
                { createdAt: Prisma.SortOrder.desc },
                { id: Prisma.SortOrder.desc },
              ],
              take: 3,
              select: {
                id: true,
                senderId: true,
                chatId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                sender: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    userProfile: { select: { avatar: true } },
                  },
                },
                reactions: {
                  select: { id: true, reaction: true, userId: true },
                },
              },
            },
          },
        },
      },
    });

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOMS_RETRIEVED,
      'Chat rooms retrieved successfully',
      {
        rooms: memberships.map(({ chat }) =>
          this.chatMapper.toChatRoom(chat, userId),
        ),
      },
    );
  }

  // NOTE: the chat is deleted once both sides have left; leaving also unpins it, so it does not hold a pin slot.
  async leaveChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatBroadcastResultV1<ChatRoomLeaveResultV1>> {
    const { roomId } = params;

    const room = await this.prisma.chat.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        participants: {
          where: { leftAt: null, deletedAt: null },
          select: { userId: true },
        },
      },
    });
    const activeMemberIds =
      room?.participants.map((participant) => participant.userId) ?? [];

    if (!activeMemberIds.includes(userId)) {
      throw this.roomNotFound(`Room ${roomId} not found`);
    }

    await this.prisma.chatMembership.update({
      where: { userId_chatId: { userId, chatId: roomId } },
      data: { leftAt: new Date(), pinPosition: null },
      select: { id: true },
    });

    const remainingMembers = await this.prisma.chatMembership.count({
      where: { chatId: roomId, leftAt: null, deletedAt: null },
    });

    if (remainingMembers === 0) {
      await this.prisma.chat.update({
        where: { id: roomId },
        // NOTE: a deleted direct chat frees its pair key, so the two can open a new one.
        data: { deletedAt: new Date(), directKey: null },
        select: { id: true },
      });

      return {
        response: this.chatMapper.toChatResponse(
          SuccessCode.CHAT_ROOM_DELETED,
          'You left the room and it was deleted.',
          { roomId, userId, status: 'userQuit', roomStatus: 'deleted' },
        ),
        recipientIds: activeMemberIds,
      };
    }

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_USER_REMOVED,
        'You have left the chat room.',
        { roomId, userId, status: 'userQuit' },
      ),
      recipientIds: activeMemberIds,
    };
  }

  // NOTE: the legacy controller never passed `limit`/`cursor`, so v1 always serves the newest page.
  async getChatMessages(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatResponseV1<ChatMessagesDataV1>> {
    const { roomId } = params;

    const room = await this.prisma.chat.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        participants: { some: { userId, leftAt: null, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!room) {
      throw this.roomNotFound(
        `Chat room with ID ${roomId} not found or user ${userId} is not a participant.`,
      );
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { chatId: roomId, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.desc },
      ],
      take: CHAT_MESSAGES_PAGE_LIMIT + 1,
      select: {
        id: true,
        senderId: true,
        chatId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            userProfile: { select: { avatar: true } },
          },
        },
        reactions: { select: { id: true, reaction: true, userId: true } },
      },
    });

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_MESSAGES_RETRIEVED,
      'Messages retrieved successfully',
      {
        messages: this.chatMapper.toChatMessagesPage(
          messages,
          CHAT_MESSAGES_PAGE_LIMIT,
        ),
      },
    );
  }

  // NOTE: the pair key is order-independent, and its unique index makes two concurrent opens resolve to one chat.
  async openDirectChat(
    callerId: string,
    data: OpenDirectChatDataV1,
  ): Promise<OpenDirectChatResultV1> {
    const { userId } = data;

    if (userId === callerId) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'You cannot open a direct chat with yourself.',
        ErrorCode.CHAT_DIRECT_SELF,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: { not: UserStatus.BANNED },
      },
      select: { id: true },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        `User ${userId} not found`,
        ErrorCode.CHAT_USER_NOT_FOUND,
      );
    }

    const directKey = [callerId, userId].sort().join(':');
    const existingChat = await this.prisma.chat.findUnique({
      where: { directKey },
      select: { id: true },
    });
    const isCreated =
      !existingChat &&
      (await this.createDirectChat(callerId, userId, directKey));

    if (!isCreated) {
      await this.prisma.chatMembership.updateMany({
        where: {
          userId: callerId,
          chat: { directKey },
          leftAt: { not: null },
          deletedAt: null,
        },
        data: { leftAt: null, joinedAt: new Date() },
      });
    }

    const room = await this.findChatRoom({ directKey, deletedAt: null });

    if (!room) {
      throw this.roomNotFound('Chat room not found');
    }

    if (isCreated) {
      return {
        response: this.chatMapper.toChatResponse(
          SuccessCode.CHAT_ROOM_CREATED,
          'Chat room created successfully',
          { room: this.chatMapper.toChatRoom(room, callerId) },
        ),
        deliveries: this.toChatRoomDeliveries(room, [callerId, userId]),
        isCreated,
      };
    }

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_ROOM_RETRIEVED,
        'Chat room retrieved successfully',
        { room: this.chatMapper.toChatRoom(room, callerId) },
      ),
      deliveries: [],
      isCreated,
    };
  }

  // NOTE: a message brings back the side who left, so nobody writes into the void.
  async reopenDirectChat(chatId: string): Promise<ChatRoomDeliveryV1[]> {
    const leftMemberships = await this.prisma.chatMembership.findMany({
      where: {
        chatId,
        leftAt: { not: null },
        deletedAt: null,
        chat: { deletedAt: null },
      },
      select: { userId: true },
    });

    if (leftMemberships.length === 0) {
      return [];
    }

    const recipientIds = leftMemberships.map(({ userId }) => userId);

    await this.prisma.chatMembership.updateMany({
      where: { chatId, userId: { in: recipientIds }, leftAt: { not: null } },
      data: { leftAt: null, joinedAt: new Date() },
    });

    const room = await this.findChatRoom({ id: chatId, deletedAt: null });

    if (!room) {
      return [];
    }

    return this.toChatRoomDeliveries(room, recipientIds);
  }

  // NOTE: a newly pinned room goes on top; pinning a pinned room changes nothing.
  async pinChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    const { roomId } = params;

    const pinnedRoomIds = await this.changeChatRoomPins(
      userId,
      async (
        tx: Prisma.TransactionClient,
        currentRoomIds: string[],
      ): Promise<void> => {
        await this.ensureActiveChatMembership(tx, userId, roomId);

        if (currentRoomIds.includes(roomId)) {
          return;
        }

        if (currentRoomIds.length >= CHAT_PINNED_ROOMS_LIMIT) {
          throw new V1ApiException(
            HttpStatus.CONFLICT,
            `You can pin at most ${CHAT_PINNED_ROOMS_LIMIT} chats.`,
            ErrorCode.CHAT_PIN_LIMIT_REACHED,
          );
        }

        await this.writeChatRoomPins(tx, userId, [roomId, ...currentRoomIds]);
      },
    );

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOM_PINNED,
      'Chat room pinned successfully',
      { pinnedRoomIds },
    );
  }

  // NOTE: unpinning a room that is not pinned changes nothing.
  async unpinChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    const { roomId } = params;

    const pinnedRoomIds = await this.changeChatRoomPins(
      userId,
      async (
        tx: Prisma.TransactionClient,
        currentRoomIds: string[],
      ): Promise<void> => {
        await this.ensureActiveChatMembership(tx, userId, roomId);

        if (!currentRoomIds.includes(roomId)) {
          return;
        }

        await tx.chatMembership.update({
          where: { userId_chatId: { userId, chatId: roomId } },
          data: { pinPosition: null },
          select: { id: true },
        });
        await this.writeChatRoomPins(
          tx,
          userId,
          currentRoomIds.filter((pinnedRoomId) => pinnedRoomId !== roomId),
        );
      },
    );

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOM_UNPINNED,
      'Chat room unpinned successfully',
      { pinnedRoomIds },
    );
  }

  // NOTE: `roomIds` must list exactly the rooms pinned now, in the new order.
  async reorderPinnedChatRooms(
    userId: string,
    data: ReorderPinnedChatRoomsDataV1,
  ): Promise<ChatResponseV1<ChatPinnedRoomsResultV1>> {
    const { roomIds } = data;

    const pinnedRoomIds = await this.changeChatRoomPins(
      userId,
      async (
        tx: Prisma.TransactionClient,
        currentRoomIds: string[],
      ): Promise<void> => {
        const isSameSet =
          new Set(roomIds).size === roomIds.length &&
          roomIds.length === currentRoomIds.length &&
          roomIds.every((roomId) => currentRoomIds.includes(roomId));

        if (!isSameSet) {
          throw new V1ApiException(
            HttpStatus.BAD_REQUEST,
            'Room IDs must match the pinned chats exactly.',
            ErrorCode.CHAT_PIN_ORDER_INVALID,
          );
        }

        await this.writeChatRoomPins(tx, userId, roomIds);
      },
    );

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_PINNED_ROOMS_REORDERED,
      'Pinned chat rooms reordered successfully',
      { pinnedRoomIds },
    );
  }

  private async findChatRoom(
    where: Prisma.ChatWhereInput,
  ): Promise<ChatRoomRecordV1 | null> {
    return await this.prisma.chat.findFirst({
      where,
      select: {
        id: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
        participants: {
          where: { deletedAt: null },
          select: {
            userId: true,
            chatId: true,
            leftAt: true,
            joinedAt: true,
            pinPosition: true,
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                userProfile: { select: { avatar: true } },
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.desc },
          ],
          take: 3,
          select: {
            id: true,
            senderId: true,
            chatId: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
                userProfile: { select: { avatar: true } },
              },
            },
            reactions: {
              select: { id: true, reaction: true, userId: true },
            },
          },
        },
      },
    });
  }

  private toChatRoomDeliveries(
    room: ChatRoomRecordV1,
    recipientIds: string[],
  ): ChatRoomDeliveryV1[] {
    return recipientIds.map((recipientId) => ({
      recipientId,
      room: this.chatMapper.toChatRoom(room, recipientId),
    }));
  }

  // NOTE: every pin change of a user runs under one advisory lock, so two parallel pins cannot both pass the
  // limit check; `change` gets the pinned room ids in order and the result is the order after it.
  private async changeChatRoomPins(
    userId: string,
    change: (
      tx: Prisma.TransactionClient,
      currentRoomIds: string[],
    ) => Promise<void>,
  ): Promise<string[]> {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<string[]> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`chat-pins:${userId}`}))`;

        await change(tx, await this.findPinnedChatRoomIds(tx, userId));

        return await this.findPinnedChatRoomIds(tx, userId);
      },
    );
  }

  // NOTE: only live memberships count, so a pin left behind on a deleted chat never takes a slot.
  private async findPinnedChatRoomIds(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<string[]> {
    const memberships = await tx.chatMembership.findMany({
      where: {
        userId,
        pinPosition: { not: null },
        leftAt: null,
        deletedAt: null,
        chat: { deletedAt: null },
      },
      orderBy: [
        { pinPosition: Prisma.SortOrder.asc },
        { chatId: Prisma.SortOrder.asc },
      ],
      select: { chatId: true },
    });

    return memberships.map(({ chatId }) => chatId);
  }

  private async ensureActiveChatMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    chatId: string,
  ): Promise<void> {
    const membership = await tx.chatMembership.findFirst({
      where: {
        userId,
        chatId,
        leftAt: null,
        deletedAt: null,
        chat: { deletedAt: null },
      },
      select: { id: true },
    });

    if (!membership) {
      throw this.roomNotFound(`Room ${chatId} not found`);
    }
  }

  private async writeChatRoomPins(
    tx: Prisma.TransactionClient,
    userId: string,
    roomIds: string[],
  ): Promise<void> {
    for (const [pinPosition, chatId] of roomIds.entries()) {
      await tx.chatMembership.update({
        where: { userId_chatId: { userId, chatId } },
        data: { pinPosition },
        select: { id: true },
      });
    }
  }

  // NOTE: false means a concurrent open created the chat first (P2002 on `directKey`).
  private async createDirectChat(
    callerId: string,
    userId: string,
    directKey: string,
  ): Promise<boolean> {
    try {
      await this.prisma.chat.create({
        data: {
          directKey,
          participants: {
            create: [{ userId: callerId }, { userId }],
          },
        },
        select: { id: true },
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }

      throw error;
    }
  }

  private roomNotFound(message: string): V1ApiException {
    return new V1ApiException(
      HttpStatus.NOT_FOUND,
      message,
      ErrorCode.CHAT_ROOM_NOT_FOUND,
    );
  }
}
