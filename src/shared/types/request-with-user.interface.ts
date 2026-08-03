import { Request } from 'express';

export interface RequestUser {
  userId: string;
  siteRole: string;
}

export interface RequestWithUser extends Request {
  user?: RequestUser;
}
