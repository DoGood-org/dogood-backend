import { Request, Response, NextFunction } from 'express';

export const validateIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      message: 'Invalid id parameter. It must be a string.',
    });
  }

  next();
};
