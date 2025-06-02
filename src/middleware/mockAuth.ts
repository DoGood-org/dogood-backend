import { Request, Response, NextFunction } from 'express';

export const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  req.user = {
    id: '3e5f3d4a-bc33-4a1f-9ac7-6d36e09e197f',
  };
  next();
};
