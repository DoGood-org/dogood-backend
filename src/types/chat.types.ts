import { SiteRoleEnum } from './user.types';
export interface ChatRoom {
  id: string;
  ownerId: number;
  owner: ChatUser;
  createdAt: string;
  updatedAt: string;

  participants?: UserStatusesInChat[];
  messages?: ChatMessage[];
  name?: string;
  description?: string;
}
export interface ChatUser {
  id: number;
  name: string;
  avatar?: string;
  siteRole?: SiteRoleEnum;
}
export interface UserStatusesInChat {
  userId: number;
  roomId: string;
  wasLeft: boolean;
  leftAt?: string;
  joinedAt: string;
}
export interface UserReactionOnMessage {
  reactionId: string;
  reaction: string;
  userId: number;
}
export interface ChatMessage {
  id: string;
  senderId: number;
  roomId: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
  reactions?: UserReactionOnMessage[];
}
export interface ChatMessageEditedDeletedReactedOn extends ChatMessage {
  editedAt?: string;
  deletedAt?: string;
  updatedAt?: string;
  status: 'edited' | 'deleted' | 'reactedOn';
  message: string;
}
export interface ReadStatus {
  userId: number;
  messageId: string;
  readAt: string;
  user: ChatUser;
}

