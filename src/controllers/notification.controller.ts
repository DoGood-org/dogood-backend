import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import * as notificationService from '@/services/notification.service';
import logger from '@/utils/logger';

/**
 * Get all notifications for the authenticated user.
 */
const getMyNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
        logger.warn('❌ Unauthorized attempt to fetch notifications');
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const { notifications, total } = await notificationService.getUserNotifications(userId, page, limit);

  res.status(200).json({
    status: 'success',
    data: notifications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

/**
 * Mark a specific notification as read.
 */
const markRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });


  const updatedNotification = await notificationService.markAsRead(id, userId);


  res.status(200).json({
    status: 'success',
    data: updatedNotification, 
  });
};

/**
 * Mark all user notifications as read.
 */
const markAllRead = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  // Сервіс оновлює всі запис і тригерить сокет 'notifications:allRead'
  await notificationService.markAllAsRead(userId);

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read',
  });
};

/**
 * Delete a specific notification.
 */
const remove = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  // Сервіс видаляє з БД + шле сокет 'notification:deleted'
  await notificationService.deleteNotification(id, userId);

  res.status(200).json({
    status: 'success',
    message: 'Notification removed',
  });
};

export const notificationControllers = {
  getMyNotifications: asyncHandler(getMyNotifications),
  markRead: asyncHandler(markRead),
  markAllRead: asyncHandler(markAllRead),
  remove: asyncHandler(remove), // Новий метод
};