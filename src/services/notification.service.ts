import { prisma } from "@/lib/prisma";
import { getIO } from "@/sockets/socketHandler";
import { NotificationType, EntityType, Notification } from "@prisma/client";
import logger from '@/utils/logger';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedId?: string;
  entityType?: EntityType;
  metadata?: Record<string, any>;
}

/**
 * Creates a notification and sends it via Socket.io.
 *
 * @param {CreateNotificationData} data - Notification payload.
 * @returns {Promise<Notification>}
 */
export const createNotification = async (data: CreateNotificationData): Promise<Notification> => {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      relatedId: data.relatedId,
      entityType: data.entityType,
      metadata: data.metadata || {},
    },
  });

  logger.info('✅ Notification created in service', { notificationId: notification.id, userId: data.userId });

  const io = getIO();
  if (io) {
    io.to(data.userId).emit("notification:new", notification);
    logger.info('📡 Notification emitted to socket room', { userId: data.userId });
  }

  return notification;
};

/**
 * Retrieves paginated notifications for a specific user.
 *
 * @param {string} userId - Target user ID.
 * @param {number} page - Current page.
 * @param {number} limit - Items per page.
 * @returns {Promise<{ notifications: Notification[], total: number }>}
 */
export const getUserNotifications = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  logger.info('📋 Notifications retrieved from DB', { userId, count: notifications.length });
  
  return { notifications, total };
};

/**
 * Marks a specific notification as read and notifies via socket.
 */
export const markAsRead = async (notificationId: string, userId: string): Promise<Notification> => {
  const notification = await prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  logger.info('📖 Notification marked as read', { notificationId, userId });

  const io = getIO();
  if (io) {
    // Повідомляємо фронтенду, що конкретне сповіщення тепер прочитане
    io.to(userId).emit("notification:updated", { id: notificationId, isRead: true });
  }

  return notification;
};

/**
 * Marks all unread notifications for a user as read.
 * * - Updates all records in DB where isRead is false.
 * - Emits 'notifications:allRead' to sync UI (e.g., clear badge count).
 * * @param {string} userId - Target user ID.
 * @returns {Promise<void>}
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  const result = await prisma.notification.updateMany({
    where: { 
      userId, 
      isRead: false 
    },
    data: { isRead: true },
  });

  logger.info('📖 All notifications marked as read', { 
    userId, 
    count: result.count 
  });

  const io = getIO();
  if (io) {
    // Повідомляємо фронту, що ВСІ сповіщення тепер прочитані
    // Фронт просто робить badgeCount = 0
    io.to(userId).emit("notifications:allRead", { success: true });
    
    logger.info('📡 Socket: allRead event emitted', { userId });
  }
};

/**
 * Deletes a specific notification.
 */
export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  await prisma.notification.delete({
    where: { id: notificationId, userId },
  });

  logger.info('🗑️ Notification deleted', { notificationId, userId });

  const io = getIO();
  if (io) {
    // Повідомляємо фронтенду видалити це сповіщення зі списку
    io.to(userId).emit("notification:deleted", { id: notificationId });
  }
};