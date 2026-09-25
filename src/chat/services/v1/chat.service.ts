import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  ChatRoomsDataV1,
  ChatUserAddedResultV1,
  ChatUserRemovedDataV1,
  CreateChatRoomDataV1,
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

  async getMyChatRooms(
    userId: string,
  ): Promise<ChatResponseV1<ChatRoomsDataV1>> {
    const rooms = await this.findChatRooms(
      {
        deletedAt: null,
        participants: { some: { userId, leftAt: null, deletedAt: null } },
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
        participants: {
          where: { leftAt: null, deletedAt: null },
          select: { userId: true },
        },
      },
    });

    if (!room) {
      throw this.roomNotFound(`Room ${roomId} not found`);
    }

    const { ownerId, participants } = room;
    const activeMemberIds = participants.map(
      (participant) => participant.userId,
    );

    if (ownerId === userId && activeMemberIds.length === 1) {
      await this.softDeleteChatRoom(roomId);

      return this.toChatRoomLeft(roomId, userId, activeMemberIds, true);
    }

    if (ownerId === userId) {
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
        participants: {
          where: { deletedAt: null },
          select: { userId: true, leftAt: true },
        },
      },
    });

    if (!room) {
      throw this.roomNotFound(`Room ${roomId} not found.`);
    }

    const { ownerId, participants } = room;

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
      select: { id: true },
    });

    if (!room) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Room not found or user not a valid participant',
        ErrorCode.CHAT_ROOM_NOT_FOUND,
      );
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
      data: { deletedAt: new Date() },
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

  private userAlreadyInRoom(userId: string): V1ApiException {
    return new V1ApiException(
      HttpStatus.CONFLICT,
      `User ${userId} is already in the room`,
      ErrorCode.CHAT_USER_ALREADY_EXISTS,
    );
  }
}
