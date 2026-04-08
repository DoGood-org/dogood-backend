import { prisma } from "@/lib/prisma";
import { getIO } from "@/sockets/socketHandler";
import { NotificationType, EntityType, Notification } from "@prisma/client";
import logger from '@/utils/logger';
import { translations } from "@/helpers/notification.translations";

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  relatedId?: string;
  entityType?: EntityType;
  metadata?: Record<string, any>;
}

/**
 * Creates a new notification, translates it based on user settings,
 * saves it to the database, and emits it via Socket.io.
 *
 * @param {CreateNotificationData} data - The notification payload.
 * @param {string} data.userId - ID of the user receiving the notification.
 * @param {NotificationType} data.type - The type of notification (from Prisma Enum).
 * @param {string} [data.relatedId] - Optional ID of the related entity (Task ID, Org ID, etc.).
 * @param {EntityType} [data.entityType] - Optional type of the related entity.
 * @param {Record<string, any>} [data.metadata] - Dynamic data for translation templates (e.g., senderName).
 * @returns {Promise<Notification>} The created notification object.
 */
const createNotification = async (data: CreateNotificationData): Promise<Notification> => {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: data.userId },
      select: { language: true }
    });

    const lang = (settings?.language === 'de' ? 'de' : 'en') as 'en' | 'de';

    const getTranslation = translations[lang][data.type];
    
    if (!getTranslation) {
      logger.error(`❌ Translation not found for type: ${data.type} in lang: ${lang}`);
      throw new Error(`Translation missing for ${data.type}`);
    }

    const { title, body } = getTranslation(data.metadata || {});

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title,
        body,
        relatedId: data.relatedId,
        entityType: data.entityType,
        metadata: data.metadata || {},
      },
    });

    logger.info('✅ Notification created and translated', { 
      id: notification.id, 
      type: data.type, 
      lang 
    });

    const io = getIO();
    if (io) {
      io.to(data.userId).emit("notification:new", notification);
    }

    return notification;
};

/**
 * Retrieves the count of unread notifications for a specific user.
 * Useful for displaying badges on the frontend.
 *
 * @param {string} userId - The unique identifier of the user.
 * @returns {Promise<number>} Total count of notifications where isRead is false.
 */
 const getUnreadCount = async (userId: string): Promise<number> => {
  return await prisma.notification.count({
    where: { userId, isRead: false }
  });
};

/**
 * Retrieves paginated notifications for a specific user.
 *
 * @param {string} userId - Target user ID.
 * @param {number} page - Current page.
 * @param {number} limit - Items per page.
 * @returns {Promise<{ notifications: Notification[], total: number }>}
 */
 const getUserNotifications = async (userId: string, page: number, limit: number) => {
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
 const markAsRead = async (notificationId: string, userId: string): Promise<Notification> => {
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
 const markAllAsRead = async (userId: string): Promise<void> => {
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
 const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
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

export const notificationService = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};