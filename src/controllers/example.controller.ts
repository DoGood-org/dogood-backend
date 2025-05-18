import { Request, Response } from 'express';

export const getExample = (req: Request, res: Response) => {
  res.json({ message: 'Example route works!' });
};
export const getTest = (req: Request, res: Response) => {
  res.json({ message: 'Example route works!' });
};
