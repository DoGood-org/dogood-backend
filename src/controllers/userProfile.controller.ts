import { Request, Response } from 'express';
import * as userService from '@/services/user.service';
import logger from '@/utils/logger';
import { getCache, setCache, deleteCache } from '@/utils/cache';

export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const cacheKey = `user-profile:${id}`;

    const cached = await getCache<typeof userService.getUserById>(cacheKey);

    if (cached) {
        logger.info(`User ${id} profile retrieved from cache`);
        return res.json(cached);
    }

    const user = await userService.getUserById(Number(id));

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    await setCache(cacheKey, user, 600);

    logger.info(`User ${id} profile retrieved from DB and cached`);
    res.json(user);
};

export const updateUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;

    const updated = await userService.updateUserById(Number(id), req.body);

    await deleteCache(`user-profile:${id}`);

    logger.info(`User ${id} profile updated and cache invalidated`);
    res.json(updated);
};
