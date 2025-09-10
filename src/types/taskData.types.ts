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
  locationName?: string;
  status?: TaskStatus;
  categories: CategoryType[];
  isOrganization: boolean;
  organizationId?: string;
  userId?: number;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  picture?: string;
  startDate?: string | Date;
  startTime?: string | Date;
  endDate?: string | Date;
  location?: { lat: number; lng: number };
  locationName?: string;
  categories?: CategoryType[];
}

export interface CachedTask {
  id: number;
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
      id: number;
      name: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    organization?: {
      id: string;
      name: string;
      createdAt: Date;
    } | null;
  };
  joinedUsers: Array<{
    id: number;
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
  userId?: number | null;
  organizationId?: string | null;
};
