import { Request, Response, NextFunction } from 'express';

export const validateIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  const numericId = Number(id);
  if (
    !id ||
    isNaN(numericId) ||
    numericId <= 0 ||
    !Number.isInteger(numericId)
  ) {
    return res.status(400).json({
      message: 'Invalid id parameter. It must be a positive integer.',
    });
  }

  next();
};
