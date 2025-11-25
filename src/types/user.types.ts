import type { Location, PaymentOption, User as PrismaUser, RefreshToken, Review, Task, UserProfile, UserSettings } from '@prisma/client';

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


export type UserWithProfileAndSettings = PrismaUser & {
  userSettings: UserSettings | null;
  profile: UserProfile | null;
};

export type FullUser = PrismaUser & {
  userSettings: UserSettings | null;
  profile: UserProfile | null;
  location: Location | null;
  paymentOptions: PaymentOption[];
  joinedTasks: Task[];
  reviewsWrittenUser: Review[];
  reviewsReceived: Review[];
  refreshTokens: RefreshToken[];
  organizations: {
    organization: {
      id: string;
      name: string;
      createdAt: Date;
    };
  }[];
  tasks: any[]; // поки any, можна типізувати через Task & hosted info
};