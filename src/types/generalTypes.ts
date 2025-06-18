export enum SiteRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  REMOVED = 'REMOVED',
  PENDING = 'PENDING',
}

// ---------- core models ----------
export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  siteRole: SiteRole;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  settings?: any;
}

export interface ChatRoom {
  id: string;
  ownerId?: number; 
  createdAt: string;
  updatedAt: string;
  participants: User[];
    name?: string;
    description?: string;
  messages?: ChatMessage[];
  wasLeft?: boolean | false;
  leftAt?: string;
}


export interface ChatMessage {
  id: string;
  senderId: number;
  roomId: string;
  content: string;
  createdAt: string;
  sender: User;
}

export interface ReadStatus {
  userId: number;
  messageId: string;
  readAt: string;
  user: User;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  hostId: number;
  host: User;
  startTime: string;
  endTime: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserOrganization {
  id: string;
  userId: number;
  organizationId: string;
  role: Role;
  status: Status;
  createdAt: string;
}
