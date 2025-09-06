import { TaskStatus, CategoryType } from '@prisma/client';

export interface CreateTaskInput {
  title: string;
  description: string;
  picture?: string;
  hostId?: number;
  startDate: string | Date;
  startTime: string | Date;
  endDate?: string | Date;
  location?: string;
  locationName?: string;
  status?: TaskStatus;
  categories: CategoryType[];
  isOrganizationTask?: boolean;
  organizationId?: string;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  picture?: string;
  startDate?: string | Date;
  startTime?: string | Date;
  endDate?: string | Date;
  location?: string;
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
  location?: string | null;
  status: TaskStatus;
  categories: CategoryType[]; // Додано категорії
  host: {
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
  location?: string;
  radiusKm?: number;
}