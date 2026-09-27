export interface HealthReadinessResultV1 {
  status: 'ready';
  timestamp: string;
  services: { database: 'up' };
}
