import { SiteRole } from '@prisma/client';
import { DefaultEventsMap, Server, Socket } from 'socket.io';

export interface RealtimeSocketDataV1 {
  userId?: string;
  role?: SiteRole;
  sessionId?: string;
}

export interface RealtimeSocketSessionV1 {
  sessionId: string;
  role: SiteRole;
}

export type RealtimeSocketV1 = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketDataV1
>;

export type RealtimeServerV1 = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketDataV1
>;
