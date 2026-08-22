import { Prisma } from '@prisma/client';

export enum NotificationSortField {
  CREATED_AT = 'createdAt',
}

export interface GetNotificationsV2 {
  search?: string;
  sort?: NotificationSortField;
  sortDirection?: Prisma.SortOrder;
  skip?: number;
  limit?: number;
  isRead?: boolean;
}
