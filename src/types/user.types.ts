


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
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}
export interface UserWithStatus extends User {
  status: 'online' | 'offline' | 'away';
}
