export interface CreateUser {
  name: string;
  email: string;
  password: string;
  emailVerificationCode: string;
  emailVerificationExpiresAt: Date;
  siteRole?: 'USER' | 'ADMIN';
  lang?: string;
}

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
export interface UserUpdate {
  name?: string;
  email?: string;
  password?: string;
  siteRole?: SiteRole;
  avatar?: string;
  settings?: any;
}
export type SiteRole = 'admin' | 'user' | 'guest';

export enum SiteRoleEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
export interface UserWithStatus extends User {
  status: 'online' | 'offline' | 'away';
}

export interface updateRefreshToken {
  tokenId: string;
  newToken: string;
  newExpiresAt: Date;
  userId: string;
}
