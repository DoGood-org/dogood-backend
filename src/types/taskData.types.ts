export interface CreateTaskInput {
  title: string;
  description: string;
  hostId: number;
  categories: number[];
  startTime: string | Date;
  endTime: string | Date;
  latitude: number;
  longitude: number;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  latitude?: number;
  longitude?: number;
  categories?: number[];
}