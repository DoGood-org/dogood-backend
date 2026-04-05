import { TaskStatus, CategoryType } from '@prisma/client';

export interface CreateTaskInput {
  title: string;
  description: string;
  picture?: string;
  hostId?: number;
  startDate: string | Date;
  startTime: string | Date;
  endDate?: string | Date;
  location?: { lat: number; lng: number };
  locationId?: number;
  locationName?: string;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  status?: TaskStatus;
  categories: CategoryType[];
  isOrganization: boolean;
  organizationId?: string;
  userId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  picture?: string;
  startDate?: string | Date;
  startTime?: string | Date;
  endDate?: string | Date;
  location?: { lat: number; lng: number };
  locationName?: string;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  categories?: CategoryType[];
}

export interface CachedTask {
  id: string;
  title: string;
  description: string;
  picture?: string | null;
  startDate: Date;
  startTime: Date;
  endDate?: Date | null;
  location?: { lat: number; lng: number };
  locationName?: string | null;
  status: TaskStatus;
  categories: CategoryType[];
  host: {
    type: 'USER' | 'ORGANIZATION';
    user?: {
      id: string;
      name: string;
      avatar?: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    organization?: {
      id: string;
      name: string;
      avatar?: string;
      createdAt: Date;
    } | null;
  };
  joinedUsers: Array<{
    id: string;
    name: string;
  }>;
}

export interface SearchTasksInput {
  title?: string;
  categories: CategoryType[];
  locationName?: string;
  location?: { lat: number; lng: number };
  radiusKm?: number;
}

export type HostData = {
  id: number;
  type: 'USER' | 'ORGANIZATION';
  userId?: string | null;
  organizationId?: string | null;
};
