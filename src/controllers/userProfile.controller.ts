import { Request, Response, NextFunction } from 'express';
import * as userService from '@/services/user.service';
import logger from '@/utils/logger';
import { httpError } from '@/helpers/httpError';


export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await userService.getUserById(Number(id));

    if (!user) return res.status(404).json({ message: 'User not found' });

    logger.info(`User ${id} profile retrieved`);
    res.json(user);
};

export const updateUserProfile = async (
    req: Request, 
    res: Response, 
    next: NextFunction // ⬅️ Додаємо 'next'
) => {
    const { id } = req.params;
    
    try {
        const updated = await userService.updateUserById(Number(id), req.body);

        logger.info(`User ${id} profile updated`);
        res.json(updated);
    } catch (error) {
        // ⬅️ ДОДАЄМО ПЕРЕВІРКУ ТИПУ!
        const errorMessage = (error as { message?: string })?.message;

        // Ми знаємо, що сервіс кидає виняток, якщо ID не знайдено
        // Обробляємо цей виняток як 404 Not Found
        if (errorMessage && errorMessage.includes('No User found')) {
            return next(httpError(404, 'User not found'));
        }
        
        // Якщо це інша помилка (наприклад, валідація, помилка БД), передаємо її далі
        next(error);
    }
};