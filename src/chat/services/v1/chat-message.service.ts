import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  ChatMessageDeletedEventV1,
  ChatMessageEditedEventV1,
  ChatMessageReactedEventV1,
  DeleteChatMessagePayloadV1,
  EditChatMessagePayloadV1,
  NewChatMessageEventV1,
  ReactToChatMessagePayloadV1,
  SendChatMessagePayloadV1,
} from 'src/chat/interfaces/chat';
import { ChatMapperV1 } from 'src/chat/mappers/v1/chat.mapper';

const CHAT_MESSAGE_MAX_LENGTH = 500;

@Injectable()
export class ChatMessageServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatMapper: ChatMapperV1,
  ) {}

  // NOTE: mirrors AuthGuard: the user must exist and not be banned; `deletedAt` is not checked there either.
  async isUserAllowedToConnect(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });

    return user !== null && user.status !== UserStatus.BANNED;
  }

  async isActiveChatMember(userId: string, chatId: string): Promise<boolean> {
    const membership = await this.findChatMembership(userId, chatId);

    return membership?.leftAt === null;
  }

  // NOTE: legacy `canSendMessage`: a non-member gets an error, a member who left is refused silently.
  async canSendChatMessage(userId: string, chatId: string): Promise<boolean> {
    const membership = await this.findChatMembership(userId, chatId);

    if (!membership) {
      throw new WsException(
        `User ${userId} is not a participant in room ${chatId}`,
      );
    }

    return membership.leftAt === null;
  }

  async sendChatMessage(
    senderId: string,
    payload: SendChatMessagePayloadV1,
  ): Promise<NewChatMessageEventV1> {
    const { eventId, content } = payload;
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new WsException('Message content is empty');
    }

    if (trimmedContent.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new WsException('Message content exceeds 500 characters');
    }

    const message = await this.prisma.chatMessage.create({
      data: { senderId, chatId: eventId, content: trimmedContent },
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

    return this.chatMapper.toNewChatMessageEvent(eventId, message);
  }

  // NOTE: legacy does not check that the message belongs to `eventId`; the event still goes to `eventId`.
  async editChatMessage(
    userId: string,
    payload: EditChatMessagePayloadV1,
  ): Promise<ChatMessageEditedEventV1> {
    const { messageId, newContent } = payload;
    const trimmedContent = newContent?.trim();

    if (!trimmedContent) {
      throw new WsException('New message content is empty');
    }

    if (trimmedContent.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new WsException('Content exceeds 500 characters');
    }

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId, deletedAt: null },
      select: { content: true },
    });

    if (!message) {
      throw new WsException(
        `Message with ID ${messageId} not found or user ${userId} is not the sender.`,
      );
    }

    if (message.content !== trimmedContent) {
      await this.prisma.chatMessage.update({
        where: { id: messageId },
        data: { content: trimmedContent },
        select: { id: true },
      });
    }

    return { messageId, newContent: trimmedContent };
  }

  async deleteChatMessage(
    userId: string,
    payload: DeleteChatMessagePayloadV1,
  ): Promise<ChatMessageDeletedEventV1> {
    const { messageId } = payload;

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, deletedAt: null },
      select: { senderId: true },
    });

    if (!message) {
      throw new WsException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new WsException('Forbidden: not your message');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { messageId };
  }

  async reactToChatMessage(
    userId: string,
    payload: ReactToChatMessagePayloadV1,
  ): Promise<ChatMessageReactedEventV1> {
    const { eventId, messageId, reaction } = payload;

    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
        chat: {
          deletedAt: null,
          participants: { some: { userId, leftAt: null, deletedAt: null } },
        },
      },
      select: { id: true },
    });

    if (!message) {
      throw new WsException('Message not found or user not in the room');
    }

    await this.prisma.chatMessageReaction.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { reaction },
      create: { messageId, userId, reaction },
      select: { id: true },
    });

    return { eventId, messageId, reaction, userId };
  }

  private async findChatMembership(
    userId: string,
    chatId: string,
  ): Promise<{ leftAt: Date | null } | null> {
    return await this.prisma.chatMembership.findFirst({
      where: { userId, chatId, deletedAt: null, chat: { deletedAt: null } },
      select: { leftAt: true },
    });
  }
}
