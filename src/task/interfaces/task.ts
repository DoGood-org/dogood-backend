import { CategoryType, HostType, TaskStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

export interface TaskHostAccess {
  hostId: string;
  type: HostType;
  userId: string | null;
  organizationId: string | null;
}

export enum TaskModifyAccessResult {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  ALLOWED = 'ALLOWED',
}

export enum TaskStatusAccessResult {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  HOST_USER_STATUS_FORBIDDEN = 'HOST_USER_STATUS_FORBIDDEN',
  ORGANIZATION_STATUS_FORBIDDEN = 'ORGANIZATION_STATUS_FORBIDDEN',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
  ALLOWED = 'ALLOWED',
}

export interface TaskGeoSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface TaskCoordinatesV1 {
  lat: number;
  lng: number;
}

export interface TaskRowV1 {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: Date;
  endDate: Date | null;
  status: TaskStatus;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  taskLocation: {
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  host: {
    type: HostType;
    user: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
      userProfile: { avatar: string | null } | null;
    } | null;
    organization: {
      id: string;
      name: string;
      avatarUrl: string | null;
      createdAt: Date;
    } | null;
  };
  participants: { user: { id: string; name: string } }[];
}

export interface TaskHostUserV1 {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskHostOrganizationV1 {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
}

export interface TaskHostV1 {
  type: HostType;
  user: TaskHostUserV1 | null;
  organization: TaskHostOrganizationV1 | null;
}

export interface TaskJoinedUserV1 {
  id: string;
  name: string;
}

// NOTE: legacy `startTime` has no column in the current schema, so it is absent from the response by design.
export interface TaskV1 {
  id: string;
  title: string;
  description: string;
  picture: string | null;
  startDate: Date;
  endDate: Date | null;
  location: TaskCoordinatesV1 | null;
  locationName: string | null;
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  status: TaskStatus;
  categories: CategoryType[];
  host: TaskHostV1;
  joinedUsers: TaskJoinedUserV1[];
}

export interface TaskResponseV1 {
  status: 'success';
  code: SuccessCode;
  data: { task: TaskV1 };
}

export interface TasksResponseV1 {
  status: 'success';
  code: SuccessCode;
  data: { tasks: TaskV1[] };
}

export interface TaskDeletedResponseV1 {
  status: 'success';
  code: SuccessCode;
}

export interface CreateTaskRequestV1 {
  title: string;
  description: string;
  picture?: string;
  isOrganization: boolean;
  organizationId?: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  location?: TaskCoordinatesV1;
  locationName?: string;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  categories: CategoryType[];
}

export interface UpdateTaskRequestV1 {
  title?: string;
  description?: string;
  picture?: string;
  startDate?: string | Date;
  startTime?: string | Date;
  endDate?: string | Date;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  location?: TaskCoordinatesV1;
  locationName?: string;
  categories?: CategoryType[];
}

export interface UpdateTaskStatusRequestV1 {
  status: TaskStatus;
}

export interface SearchTasksRequestV1 {
  title?: string;
  categories?: CategoryType[];
  locationName?: string;
  location?: TaskCoordinatesV1;
  radiusKm?: number;
}

export enum TaskSortFieldV2 {
  TITLE = 'title',
  START_DATE = 'startDate',
  CREATED_AT = 'createdAt',
}

export interface TaskHostV2 {
  id: string;
  type: HostType;
  name: string | null;
  avatar: string | null;
}

export interface TaskRowV2 {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: Date;
  endDate: Date | null;
  status: TaskStatus;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  createdAt: Date;
  taskLocation: {
    name: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  host: {
    id: string;
    type: HostType;
    user: {
      name: string;
      userProfile: { avatar: string | null } | null;
    } | null;
    organization: { name: string; avatarUrl: string | null } | null;
  };
}

export interface TaskV2 {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: Date;
  endDate: Date | null;
  status: TaskStatus;
  categories: CategoryType[];
  amount: number | null;
  currentAmount: number | null;
  currency: string | null;
  requirements: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  host: TaskHostV2;
  createdAt: Date;
}

export interface TaskParticipantRowV2 {
  createdAt: Date;
  user: {
    id: string;
    name: string;
    userProfile: { avatar: string | null } | null;
  };
}

export interface TaskParticipantV2 {
  id: string;
  name: string;
  avatar: string | null;
  joinedAt: Date;
}

export interface GetTasksRequestV2 {
  search?: string;
  categories?: CategoryType[];
  locationName?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sort?: TaskSortFieldV2;
  sortDirection?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export interface GetTaskParticipantsRequestV2 {
  skip?: number;
  limit?: number;
}

export interface CreateTaskRequestV2 {
  title: string;
  description: string;
  imageUrl?: string;
  isOrganization: boolean;
  organizationId?: string;
  startDate: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  categories: CategoryType[];
}

export interface UpdateTaskRequestV2 {
  title?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  amount?: number;
  currentAmount?: number;
  currency?: string;
  requirements?: string;
  categories?: CategoryType[];
}

export interface UpdateTaskStatusRequestV2 {
  status: TaskStatus;
}
