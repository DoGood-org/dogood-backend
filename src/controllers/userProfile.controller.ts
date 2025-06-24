import { Request, Response } from 'express';
import * as userService from '@/services/user.service';
import logger from '@/utils/logger';
import redis from '@/lib/redis';


export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    const cacheKey = `user-profile:${id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
        logger.info(`User ${id} profile retrieved from cache`);
        return res.json(JSON.parse(cached));
    }
    const user = await userService.getUserById(Number(id));

    if (!user) return res.status(404).json({ message: 'User not found' });

    await redis.set(cacheKey, JSON.stringify(user), 'EX', 600);

    logger.info(`User ${id} profile retrieved`);
    res.json(user);
};



export const updateUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    const updated = await userService.updateUserById(Number(id), req.body);

    await redis.del(`user-profile:${id}`);

    logger.info(`User ${id} profile updated`);
    res.json(updated);
};
