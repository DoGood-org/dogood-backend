import { Prisma } from '@prisma/client';

export enum UserSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export interface GetUserProfilesV2 {
  search?: string;
  sort?: UserSortField;
  sortDirection?: Prisma.SortOrder;
  skip?: number;
  limit?: number;
}

export interface UserV2 {
  id: string;
  name: string;
  avatar: string | null;
}
