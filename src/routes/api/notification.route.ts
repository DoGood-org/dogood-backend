import express from 'express';
import { authenticateUser } from '@/middlewares';
import { notificationControllers } from '@/controllers/notification.controller';


export const notificationRoute = express.Router();



// GET /api/notifications?page=1&limit=20
notificationRoute.get('/', authenticateUser, notificationControllers.getMyNotifications);

// PATCH /api/notifications/read-all
notificationRoute.patch('/read-all', authenticateUser, notificationControllers.markAllRead);

// PATCH /api/notifications/:id/read
notificationRoute.patch('/:id/read', authenticateUser, notificationControllers.markRead);

// DELETE /api/notifications/:id
notificationRoute.delete('/:id', authenticateUser, notificationControllers.remove);