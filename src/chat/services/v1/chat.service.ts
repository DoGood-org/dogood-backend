import { HttpStatus, Injectable } from '@nestjs/common';
import { ChatType, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import {
  ChatBroadcastResultV1,
  ChatMemberParamsV1,
  ChatMessagesDataV1,
  ChatResponseV1,
  ChatRoomDataV1,
  ChatRoomLeaveResultV1,
  ChatRoomParamsV1,
  ChatRoomRecordV1,
  ChatRoomReopenedResultV1,
  ChatRoomsDataV1,
  ChatRoomsParamsV1,
  ChatUserAddedResultV1,
  ChatUserRemovedDataV1,
  CreateChatRoomDataV1,
  OpenDirectChatDataV1,
  OpenDirectChatResultV1,
} from 'src/chat/interfaces/chat';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';

const CHAT_MESSAGES_PAGE_LIMIT = 20;

@Injectable()
export class ChatServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatMapper: ChatMapperV1,
  ) {}

  // NOTE: unknown or deleted invitees are dropped silently (legacy); the caller is always a participant.
  async createChatRoom(
    ownerId: string,
    data: CreateChatRoomDataV1,
  ): Promise<ChatBroadcastResultV1<ChatRoomDataV1>> {
    const { participantsIds } = data;

    const invitedUsers = await this.prisma.user.findMany({
      where: {
        id: { in: participantsIds.filter((id) => id !== ownerId) },
        deletedAt: null,
      },
      select: { id: true },
    });

    const memberIds = [ownerId, ...invitedUsers.map(({ id }) => id)];

    const room = await this.prisma.chat.create({
      data: {
        ownerId,
        name: `Chat ${new Date().toISOString()}`,
        description: '',
        participants: {
          create: memberIds.map((userId) => ({ userId })),
        },
      },
      select: {
        id: true,
        ownerId: true,
        type: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
            userProfile: { select: { avatar: true } },
          },
        },
        participants: {
          select: { userId: true, chatId: true, leftAt: true, joinedAt: true },
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

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_ROOM_CREATED,
        'Chat room created successfully',
        { room: this.chatMapper.toChatRoom(room) },
      ),
      recipientIds: memberIds,
    };
  }

  // NOTE: `participants` lists every member, including those who left (legacy).
  async getChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatResponseV1<ChatRoomDataV1>> {
    const { roomId } = params;

    const [room] = await this.findChatRooms(
      {
        id: roomId,
        deletedAt: null,
        participants: { some: { userId, leftAt: null, deletedAt: null } },
      },
      { deletedAt: null },
    );

    if (!room) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Chat room not found',
        ErrorCode.CHAT_ROOM_NOT_FOUND,
      );
    }

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOM_RETRIEVED,
      'Chat room retrieved successfully',
      { room: this.chatMapper.toChatRoom(room) },
    );
  }

  // NOTE: `search` matches the chat name or the name of another active participant; the caller never matches themselves.
  async getMyChatRooms(
    userId: string,
    params: ChatRoomsParamsV1,
  ): Promise<ChatResponseV1<ChatRoomsDataV1>> {
    const { search } = params;
    // NOTE: Prisma passes `contains` into LIKE as is, so `%`, `_` and `\` are escaped to match literally.
    const searchFilter = {
      contains: search?.replace(/[\\%_]/g, '\\$&'),
      mode: Prisma.QueryMode.insensitive,
    };

    const rooms = await this.findChatRooms(
      {
        deletedAt: null,
        participants: { some: { userId, leftAt: null, deletedAt: null } },
        ...(search && {
          OR: [
            { name: searchFilter },
            {
              participants: {
                some: {
                  userId: { not: userId },
                  leftAt: null,
                  deletedAt: null,
                  user: { deletedAt: null, name: searchFilter },
                },
              },
            },
          ],
        }),
      },
      { leftAt: null, deletedAt: null },
    );

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_ROOMS_RETRIEVED,
      'Chat rooms retrieved successfully',
      { rooms: rooms.map((room) => this.chatMapper.toChatRoom(room)) },
    );
  }

  // NOTE: the owner may leave only when exactly one active member is left, whoever it is (legacy `isAlone`).
  async leaveChatRoom(
    userId: string,
    params: ChatRoomParamsV1,
  ): Promise<ChatBroadcastResultV1<ChatRoomLeaveResultV1>> {
    const { roomId } = params;

    const room = await this.prisma.chat.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        ownerId: true,
        type: true,
        participants: {
          where: { leftAt: null, deletedAt: null },
          select: { userId: true },
        },
      },
    });

    if (!room) {
      throw this.roomNotFound(`Room ${roomId} not found`);
    }

    const { ownerId, type, participants } = room;
    const activeMemberIds = participants.map(
      (participant) => participant.userId,
    );
    // NOTE: a direct chat has no owner rules: either side may leave.
    const isOwner = type === ChatType.GROUP && ownerId === userId;

    if (isOwner && activeMemberIds.length === 1) {
      await this.softDeleteChatRoom(roomId);

      return this.toChatRoomLeft(roomId, userId, activeMemberIds, true);
    }

    if (isOwner) {
      const message = 'Room owners must delete the room instead of leaving it.';

      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        message,
        ErrorCode.CHAT_ACCESS_DENIED,
        {
          status: 'error',
          code: ErrorCode.CHAT_ACCESS_DENIED,
          message,
          data: { roomId, userId, status: 'userIsOwner' },
        },
      );
    }

    if (!activeMemberIds.includes(userId)) {
      throw this.roomNotFound(`Room ${roomId} not found`);
    }

    await this.prisma.chatMembership.update({
      where: { userId_chatId: { userId, chatId: roomId } },
      data: { leftAt: new Date() },
      select: { id: true },
    });

    const remainingMembers = await this.prisma.chatMembership.count({
      where: { chatId: roomId, leftAt: null, deletedAt: null },
    });

    if (remainingMembers === 0) {
      await this.softDeleteChatRoom(roomId);
    }

    return this.toChatRoomLeft(
      roomId,
      userId,
      activeMemberIds,
      remainingMembers === 0,
    );
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
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        `Chat room with ID ${roomId} not found or user ${userId} is not a participant.`,
        ErrorCode.CHAT_ROOM_NOT_FOUND,
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

  async addUserToChatRoom(
    callerId: string,
    params: ChatMemberParamsV1,
  ): Promise<ChatBroadcastResultV1<ChatUserAddedResultV1>> {
    const { roomId, userId } = params;

    const room = await this.prisma.chat.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        ownerId: true,
        type: true,
        participants: {
          where: { deletedAt: null },
          select: { userId: true, leftAt: true },
        },
      },
    });

    if (!room) {
      throw this.roomNotFound(`Room ${roomId} not found.`);
    }

    const { ownerId, type, participants } = room;

    if (type === ChatType.DIRECT) {
      throw this.directChatMembersFixed(roomId);
    }

    if (ownerId !== callerId) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        `User ${callerId} is not the owner of room ${roomId}.`,
        ErrorCode.CHAT_ACCESS_DENIED,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        role: true,
        userProfile: { select: { avatar: true } },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        `User ${userId} not found`,
        ErrorCode.CHAT_USER_NOT_FOUND,
      );
    }

    const membership = participants.find(
      (participant) => participant.userId === userId,
    );

    if (membership?.leftAt === null) {
      throw this.userAlreadyInRoom(userId);
    }

    if (membership) {
      await this.prisma.chatMembership.update({
        where: { userId_chatId: { userId, chatId: roomId } },
        data: { leftAt: null, joinedAt: new Date() },
        select: { id: true },
      });
    } else {
      await this.createChatMembership(userId, roomId);
    }

    const activeMemberIds = participants
      .filter((participant) => participant.leftAt === null)
      .map((participant) => participant.userId);

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_USER_ADDED,
        'User added to chat room',
        {
          roomId,
          user: this.chatMapper.toChatUser(user),
          status: membership ? 'reactivated' : 'added',
        },
      ),
      recipientIds: [...activeMemberIds, userId],
    };
  }

  // NOTE: the owner may kick themselves (legacy, see TECH_DEBT).
  async removeUserFromChatRoom(
    callerId: string,
    params: ChatMemberParamsV1,
  ): Promise<ChatResponseV1<ChatUserRemovedDataV1>> {
    const { roomId, userId } = params;

    const room = await this.prisma.chat.findFirst({
      where: {
        id: roomId,
        ownerId: callerId,
        deletedAt: null,
        participants: { some: { userId, leftAt: null, deletedAt: null } },
      },
      select: { type: true },
    });

    if (!room) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Room not found or user not a valid participant',
        ErrorCode.CHAT_ROOM_NOT_FOUND,
      );
    }

    if (room.type === ChatType.DIRECT) {
      throw this.directChatMembersFixed(roomId);
    }

    await this.prisma.chatMembership.update({
      where: { userId_chatId: { userId, chatId: roomId } },
      data: { leftAt: new Date() },
      select: { id: true },
    });

    return this.chatMapper.toChatResponse(
      SuccessCode.CHAT_USER_REMOVED,
      'User removed from chat room successfully',
      { room: { roomId, userId, status: 'removed' } },
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

    const [room] = await this.findChatRooms(
      { directKey, deletedAt: null },
      { deletedAt: null },
    );

    if (!room) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Chat room not found',
        ErrorCode.CHAT_ROOM_NOT_FOUND,
      );
    }

    if (isCreated) {
      return {
        response: this.chatMapper.toChatResponse(
          SuccessCode.CHAT_ROOM_CREATED,
          'Chat room created successfully',
          { room: this.chatMapper.toChatRoom(room) },
        ),
        recipientIds: [callerId, userId],
        isCreated,
      };
    }

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_ROOM_RETRIEVED,
        'Chat room retrieved successfully',
        { room: this.chatMapper.toChatRoom(room) },
      ),
      recipientIds: [],
      isCreated,
    };
  }

  // NOTE: a message in a direct chat brings back the side who left, so nobody writes into the void.
  async reopenDirectChat(
    chatId: string,
  ): Promise<ChatRoomReopenedResultV1 | null> {
    const leftMemberships = await this.prisma.chatMembership.findMany({
      where: {
        chatId,
        leftAt: { not: null },
        deletedAt: null,
        chat: { type: ChatType.DIRECT, deletedAt: null },
      },
      select: { userId: true },
    });

    if (leftMemberships.length === 0) {
      return null;
    }

    const recipientIds = leftMemberships.map(({ userId }) => userId);

    await this.prisma.chatMembership.updateMany({
      where: { chatId, userId: { in: recipientIds }, leftAt: { not: null } },
      data: { leftAt: null, joinedAt: new Date() },
    });

    const [room] = await this.findChatRooms(
      { id: chatId, deletedAt: null },
      { deletedAt: null },
    );

    if (!room) {
      return null;
    }

    return { room: this.chatMapper.toChatRoom(room), recipientIds };
  }

  private async findChatRooms(
    where: Prisma.ChatWhereInput,
    participantsWhere: Prisma.ChatMembershipWhereInput,
  ): Promise<ChatRoomRecordV1[]> {
    return await this.prisma.chat.findMany({
      where,
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.desc },
      ],
      select: {
        id: true,
        ownerId: true,
        type: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
            userProfile: { select: { avatar: true } },
          },
        },
        participants: {
          where: participantsWhere,
          select: { userId: true, chatId: true, leftAt: true, joinedAt: true },
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

  // NOTE: false means a concurrent open created the chat first (P2002 on `directKey`).
  private async createDirectChat(
    callerId: string,
    userId: string,
    directKey: string,
  ): Promise<boolean> {
    try {
      await this.prisma.chat.create({
        data: {
          ownerId: callerId,
          type: ChatType.DIRECT,
          directKey,
          name: `Chat ${new Date().toISOString()}`,
          description: '',
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

  private async createChatMembership(
    userId: string,
    chatId: string,
  ): Promise<void> {
    try {
      await this.prisma.chatMembership.create({
        data: { userId, chatId },
        select: { id: true },
      });
    } catch (error) {
      // NOTE: P2002 means a concurrent invite created the membership first.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.userAlreadyInRoom(userId);
      }

      throw error;
    }
  }

  private async softDeleteChatRoom(roomId: string): Promise<void> {
    await this.prisma.chat.update({
      where: { id: roomId },
      // NOTE: a deleted direct chat frees its pair key, so the two can open a new one.
      data: { deletedAt: new Date(), directKey: null },
      select: { id: true },
    });
  }

  private toChatRoomLeft(
    roomId: string,
    userId: string,
    recipientIds: string[],
    isRoomDeleted: boolean,
  ): ChatBroadcastResultV1<ChatRoomLeaveResultV1> {
    if (isRoomDeleted) {
      return {
        response: this.chatMapper.toChatResponse(
          SuccessCode.CHAT_ROOM_DELETED,
          'You left the room and it was deleted.',
          { roomId, userId, status: 'userQuit', roomStatus: 'deleted' },
        ),
        recipientIds,
      };
    }

    return {
      response: this.chatMapper.toChatResponse(
        SuccessCode.CHAT_USER_REMOVED,
        'You have left the chat room.',
        { roomId, userId, status: 'userQuit' },
      ),
      recipientIds,
    };
  }

  private roomNotFound(message: string): V1ApiException {
    return new V1ApiException(
      HttpStatus.NOT_FOUND,
      message,
      ErrorCode.CHAT_ROOM_NOT_FOUND,
    );
  }

  private directChatMembersFixed(roomId: string): V1ApiException {
    return new V1ApiException(
      HttpStatus.FORBIDDEN,
      `Room ${roomId} is a direct chat: members cannot be added or removed.`,
      ErrorCode.CHAT_ACCESS_DENIED,
    );
  }

  private userAlreadyInRoom(userId: string): V1ApiException {
    return new V1ApiException(
      HttpStatus.CONFLICT,
      `User ${userId} is already in the room`,
      ErrorCode.CHAT_USER_ALREADY_EXISTS,
    );
  }
}
