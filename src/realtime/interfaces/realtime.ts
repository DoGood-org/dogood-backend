import { SiteRole } from '@prisma/client';
import { DefaultEventsMap, Socket } from 'socket.io';

export interface RealtimeSocketDataV1 {
  userId?: string;
  role?: SiteRole;
}

export type RealtimeSocketV1 = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketDataV1
>;
