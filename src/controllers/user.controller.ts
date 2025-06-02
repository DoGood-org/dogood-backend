import { Request, Response } from 'express';
import { prisma } from '../lib/prisma/client';
import { updateProfileSchema } from '../validators/user.schema';

//get
export const getProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      location: true,
    },
  });

  if (!user) return res.status(404).json({ message: 'User not found' });

  return res.json(user);
};

//update
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ errors: validation.error.format() });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: validation.data,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      location: true,
    },
  });

  return res.json(updated);
};
