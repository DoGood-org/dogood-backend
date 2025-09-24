import { SiteRoleEnum } from './user.types';
export interface IChatRoom {
  id: string;
  name: string | '';
  description: string | '';
  ownerId: string;
  owner: IChatUser;
  createdAt: string | Date;
  updatedAt: string | Date;
  participants: IUserStatusesInChat[];
  messages: IChatMessage[];
}
export interface IChatUser {
  id: string;
  name: string;
  avatar?: string; 
  siteRole: SiteRoleEnum; 
}
export interface IUserStatusesInChat {
  userId: string;
  roomId: string;
  wasLeft: boolean;
  leftAt: Date | null;
  joinedAt: Date;
}
export interface IUserReactionOnMessage {
  reactionId: string;
  reaction: string;
  userId: string;
}
export interface IChatMessage {
  id: string;
  senderId: string;
  sender: IChatUser;
  roomId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  reactions?: IUserReactionOnMessage[];
}
export interface IChatMessageEditedDeletedReactedOn extends IChatMessage {
  editedAt?: string;
  deletedAt?: string;
  updatedAt?: string;
  status: 'edited' | 'deleted' | 'reactedOn';
  message: string;
}
export interface IReadStatus {
  userId: string;
  messageId: string;
  readAt: string;
  user: IChatUser;
}

export interface IChatUserAdded {
  roomId: string;
  user: IChatUser;
  status: 'added' | 'reactivated';
}
