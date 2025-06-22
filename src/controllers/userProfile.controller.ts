import { Request, Response } from 'express';
import * as userService from '@/services/user.service';
import logger from '@/utils/logger';


export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await userService.getUserById(Number(id));

    if (!user) return res.status(404).json({ message: 'User not found' });

    logger.info(`User ${id} profile retrieved`);
    res.json(user);
};

export const updateUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await userService.updateUserById(Number(id), req.body);

    logger.info(`User ${id} profile updated`);
    res.json(updated);
};