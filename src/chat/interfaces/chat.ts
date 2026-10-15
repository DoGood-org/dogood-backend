import { SiteRole } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import { DefaultEventsMap, Socket } from 'socket.io';
import { RealtimeSocketDataV1 } from 'src/realtime/interfaces/realtime';

export const CHAT_PINNED_ROOMS_LIMIT = 5;

export interface OpenDirectChatDataV1 {
  userId: string;
}

export interface ChatRoomsParamsV1 {
  search?: string;
}

export interface ChatRoomParamsV1 {
  roomId: string;
}

export interface ReorderPinnedChatRoomsDataV1 {
  roomIds: string[];
}

export interface ChatUserRecordV1 {
  id: string;
  name: string;
  role: SiteRole;
  userProfile: { avatar: string | null } | null;
}

export interface ChatMembershipRecordV1 {
  userId: string;
  chatId: string;
  leftAt: Date | null;
  joinedAt: Date;
  pinPosition: number | null;
  user: ChatUserRecordV1;
}

export interface ChatReactionRecordV1 {
  id: string;
  reaction: string;
  userId: string;
}

export interface ChatMessageRecordV1 {
  id: string;
  senderId: string;
  chatId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  sender: ChatUserRecordV1;
  reactions: ChatReactionRecordV1[];
}

export interface ChatRoomRecordV1 {
  id: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  participants: ChatMembershipRecordV1[];
  messages: ChatMessageRecordV1[];
}

export interface ChatUserV1 {
  id: string;
  name: string;
  siteRole: SiteRole;
  avatar?: string;
}

export interface ChatParticipantV1 {
  userId: string;
  roomId: string;
  wasLeft: boolean;
  leftAt: Date | null;
  joinedAt: Date;
}

export interface ChatReactionV1 {
  reactionId: string;
  reaction: string;
  userId: string;
}

export interface ChatMessageV1 {
  id: string;
  senderId: string;
  sender: ChatUserV1;
  roomId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  reactions: ChatReactionV1[];
}

// NOTE: a room is always seen by one member: `name`, `interlocutor` and `isPinned` are from that member's side.
export interface ChatRoomV1 {
  id: string;
  name: string;
  interlocutor: ChatUserV1 | null;
  isPinned: boolean;
  participants: ChatParticipantV1[];
  messages: ChatMessageV1[];
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoomDataV1 {
  room: ChatRoomV1;
}

export interface ChatRoomsDataV1 {
  rooms: ChatRoomV1[];
}

export interface ChatMessagesPageV1 {
  messages: ChatMessageV1[];
  nextCursor: string | null;
}

export interface ChatMessagesDataV1 {
  messages: ChatMessagesPageV1;
}

export interface ChatRoomLeaveResultV1 {
  roomId: string;
  userId: string;
  status: 'userQuit';
  roomStatus?: 'deleted';
}

export interface ChatPinnedRoomsResultV1 {
  pinnedRoomIds: string[];
}

export interface ChatResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  message: string;
  data: T;
}

// NOTE: `recipientIds` are the personal socket rooms (`userId`) the controller broadcasts the REST event to.
export interface ChatBroadcastResultV1<T> {
  response: ChatResponseV1<T>;
  recipientIds: string[];
}

// NOTE: one `chatRoomCreated` per recipient, since every member sees the room from their own side.
export interface ChatRoomDeliveryV1 {
  recipientId: string;
  room: ChatRoomV1;
}

// NOTE: `isCreated` picks the HTTP status (201 / 200); `deliveries` is empty when an existing chat is opened.
export interface OpenDirectChatResultV1 {
  response: ChatResponseV1<ChatRoomDataV1>;
  deliveries: ChatRoomDeliveryV1[];
  isCreated: boolean;
}

export interface ChatEventRoomPayloadV1 {
  eventId: string;
}

export interface SendChatMessagePayloadV1 {
  eventId: string;
  content: string;
}

export interface EditChatMessagePayloadV1 {
  eventId: string;
  messageId: string;
  newContent: string;
}

export interface DeleteChatMessagePayloadV1 {
  eventId: string;
  messageId: string;
}

export interface ReactToChatMessagePayloadV1 {
  eventId: string;
  messageId: string;
  reaction: string;
}

export interface ChatSocketAckV1 {
  success?: true;
  error?: string;
}

export interface NewChatMessageEventV1 {
  eventId: string;
  messageId: string;
  content: string;
  timestamp: string;
  user: ChatUserV1;
}

export interface ChatMessageEditedEventV1 {
  messageId: string;
  newContent: string;
}

export interface ChatMessageDeletedEventV1 {
  messageId: string;
}

export interface ChatMessageReactedEventV1 {
  eventId: string;
  messageId: string;
  reaction: string;
  userId: string;
}

export interface ChatSocketDataV1 extends RealtimeSocketDataV1 {
  lastTypingAt?: number;
}

export type ChatSocketV1 = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  ChatSocketDataV1
>;
