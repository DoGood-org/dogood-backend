import { NotificationType, Prisma } from '@prisma/client';

export const NOTIFICATION_SELECT_V1 = {
  id: true,
  userId: true,
  type: true,
  title: true,
  body: true,
  relatedId: true,
  entityType: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export interface NotificationRowV1 {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationV1 {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  isRead: boolean;
  createdAt: Date;
}

export interface GetMyNotificationsRequestV1 {
  page?: string;
  limit?: string;
}

export interface MyNotificationsPageV1 {
  rows: NotificationRowV1[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationPaginationV1 {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MyNotificationsResponseV1 {
  status: 'success';
  data: NotificationV1[];
  pagination: NotificationPaginationV1;
}

export interface NotificationResponseV1 {
  status: 'success';
  data: NotificationV1;
}

export interface NotificationMessageResponseV1 {
  status: 'success';
  message: string;
}

export const NOTIFICATION_SELECT_V2 = {
  id: true,
  type: true,
  title: true,
  body: true,
  relatedId: true,
  entityType: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export interface NotificationV2 {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId: string | null;
  entityType: string | null;
  metadata: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface GetMyNotificationsRequestV2 {
  skip?: number;
  limit?: number;
}

export interface MarkAllMyNotificationsReadResultV2 {
  count: number;
}
