import { User } from "./user.types";


export interface UserStatusesInChat {
  userId: number;
  roomId: string;
  wasLeft: boolean;
  leftAt: string;
  joinedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: number;
  roomId: string;
  content: string;
  createdAt: string;
  sender: User;
  reactions?: {
    userId: number;
    reaction: string;
  }[];
}
export interface ChatMessageEditedDeletedReactedOn extends ChatMessage {
  reactions?: {
    userId: number;
    reaction: string;
  }[];
  editedBy?: number;
  editedAt?: string;
  deletedBy?: number;
  deletedAt?: string;
  status: 'edited' | 'deleted';
  message: string;
}

export interface ReadStatus {
  userId: number;
  messageId: string;
  readAt: string;
  user: User;
}
export interface ChatRoom {
  id: string;
  ownerId?: number;
  createdAt: string;
  updatedAt: string;

  participants: UserStatusesInChat[];
  name?: string;
  description?: string;
  messages?: ChatMessage[];
}
