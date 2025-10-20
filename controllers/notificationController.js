import { Notification, User } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all notifications for the authenticated user
 */
export const getNotifications = async (req, res) => {
  try {
    console.log('🔔 getNotifications called for user:', req.user?.id);
    const userId = req.user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    const whereClause = { user_id: userId };
    if (unread_only === 'true') {
      whereClause.is_read = false;
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log('🔔 Found notifications:', notifications.length);
    console.log('🔔 Notifications:', notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));

    res.json({
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.is_read,
        created_at: notification.created_at,
        data: notification.data
      }))
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

/**
 * Create a new notification
 */
export const createNotification = async (req, res) => {
  try {
    const { type, title, message, user_id, data } = req.body;
    
    // If user_id is provided, create for that user, otherwise for the authenticated user
    const targetUserId = user_id || req.user.id;

    const notification = await Notification.create({
      user_id: targetUserId,
      type,
      title,
      message,
      data: data || {},
      is_read: false
    });

    res.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.is_read,
        created_at: notification.created_at,
        data: notification.data
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({ is_read: true });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

/**
 * Clear all notifications for the authenticated user
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.destroy({
      where: { user_id: userId }
    });

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all notifications'
    });
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalNotifications = await Notification.count({
      where: { user_id: userId }
    });

    const unreadNotifications = await Notification.count({
      where: { user_id: userId, is_read: false }
    });

    const notificationsByType = await Notification.findAll({
      where: { user_id: userId },
      attributes: [
        'type',
        [Notification.sequelize.fn('COUNT', Notification.sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    res.json({
      success: true,
      stats: {
        total: totalNotifications,
        unread: unreadNotifications,
        byType: notificationsByType.reduce((acc, item) => {
          acc[item.type] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
};

/**
 * Bulk create notifications (for system events)
 */
export const bulkCreateNotifications = async (req, res) => {
  try {
    const { notifications } = req.body; // Array of notification objects

    if (!Array.isArray(notifications)) {
      return res.status(400).json({
        success: false,
        message: 'Notifications must be an array'
      });
    }

    const createdNotifications = await Notification.bulkCreate(
      notifications.map(notification => ({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        is_read: false
      }))
    );

    res.json({
      success: true,
      message: `${createdNotifications.length} notifications created`,
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Error bulk creating notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notifications'
    });
  }
};
