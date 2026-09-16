import { HostType } from '@prisma/client';

export interface HostResult {
  id: string;
  type: HostType;
  userId: string | null;
  organizationId: string | null;
}
