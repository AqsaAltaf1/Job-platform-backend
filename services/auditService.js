import { AuditLog, PrivacySetting, DataExport, User, ProfileView, Reference, ReferenceInvitation } from '../models/index.js';
import { Op } from 'sequelize';

class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent({
    userId,
    actionType,
    actionCategory,
    description,
    targetUserId = null,
    targetResourceId = null,
    targetResourceType = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
    sessionId = null
  }) {
    try {
      await AuditLog.create({
        user_id: userId,
        action_type: actionType,
        action_category: actionCategory,
        description,
        target_user_id: targetUserId,
        target_resource_id: targetResourceId,
        target_resource_type: targetResourceType,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        performed_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get comprehensive audit log for a user
   */
  static async getAuditLog(userId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      actionTypes = [],
      actionCategories = [],
      limit = 100,
      offset = 0
    } = options;

    const whereClause = {
      user_id: userId
    };

    if (startDate || endDate) {
      whereClause.performed_at = {};
      if (startDate) whereClause.performed_at[Op.gte] = startDate;
      if (endDate) whereClause.performed_at[Op.lte] = endDate;
    }

    if (actionTypes.length > 0) {
      whereClause.action_type = { [Op.in]: actionTypes };
    }

    if (actionCategories.length > 0) {
      whereClause.action_category = { [Op.in]: actionCategories };
    }

    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['performed_at', 'DESC']],
      limit,
      offset
    });

    return auditLogs;
  }

  /**
   * Get activity timeline with aggregated data
   */
  static async getActivityTimeline(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await AuditLog.findAll({
      where: {
        user_id: userId,
        performed_at: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'targetUser',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['performed_at', 'DESC']]
    });

    // Group by date
    const timeline = {};
    activities.forEach(activity => {
      const date = activity.performed_at.toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = [];
      }
      timeline[date].push(activity);
    });

    return timeline;
  }

  /**
   * Get analytics data for transparency dashboard
   */
  static async getTransparencyAnalytics(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Profile views analytics
    const profileViews = await ProfileView.findAll({
      where: {
        candidate_id: userId,
        viewed_at: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: User,
          as: 'viewer',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['viewed_at', 'DESC']]
    });

    // Activity analytics
    const activities = await AuditLog.findAll({
      where: {
        user_id: userId,
        performed_at: {
          [Op.gte]: startDate
        }
      },
      order: [['performed_at', 'DESC']]
    });

    // Group by action type
    const activityStats = {};
    activities.forEach(activity => {
      if (!activityStats[activity.action_type]) {
        activityStats[activity.action_type] = 0;
      }
      activityStats[activity.action_type]++;
    });

    // Group by date
    const dailyStats = {};
    activities.forEach(activity => {
      const date = activity.performed_at.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          profile_views: 0,
          reference_activities: 0,
          privacy_changes: 0,
          data_access: 0,
          total_activities: 0
        };
      }
      
      if (activity.action_type === 'profile_view') {
        dailyStats[date].profile_views++;
      } else if (activity.action_category === 'reference') {
        dailyStats[date].reference_activities++;
      } else if (activity.action_category === 'privacy') {
        dailyStats[date].privacy_changes++;
      } else if (activity.action_category === 'data') {
        dailyStats[date].data_access++;
      }
      
      dailyStats[date].total_activities++;
    });

    return {
      profileViews,
      activities,
      activityStats,
      dailyStats,
      totalProfileViews: profileViews.length,
      totalActivities: activities.length
    };
  }

  /**
   * Create privacy setting
   */
  static async createPrivacySetting({
    userId,
    settingType,
    settingValue,
    effectiveFrom = new Date(),
    effectiveUntil = null,
    createdBy = null
  }) {
    // Deactivate previous setting of same type
    await PrivacySetting.update(
      { is_active: false },
      {
        where: {
          user_id: userId,
          setting_type: settingType,
          is_active: true
        }
      }
    );

    const setting = await PrivacySetting.create({
      user_id: userId,
      setting_type: settingType,
      setting_value: settingValue,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil,
      created_by: createdBy
    });

    // Log the privacy setting change
    await this.logEvent({
      userId,
      actionType: 'privacy_setting_change',
      actionCategory: 'privacy',
      description: `Updated ${settingType} setting`,
      metadata: {
        settingType,
        settingValue,
        previousValue: null // Could be enhanced to track previous values
      }
    });

    return setting;
  }

  /**
   * Get user privacy settings
   */
  static async getPrivacySettings(userId) {
    const settings = await PrivacySetting.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_type] = setting.setting_value;
    });

    return settingsMap;
  }

  /**
   * Request data export
   */
  static async requestDataExport({
    userId,
    exportType,
    exportFormat = 'json'
  }) {
    const exportRequest = await DataExport.create({
      user_id: userId,
      export_type: exportType,
      export_format: exportFormat,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Log the export request
    await this.logEvent({
      userId,
      actionType: 'data_export',
      actionCategory: 'data',
      description: `Requested ${exportType} export in ${exportFormat} format`,
      targetResourceId: exportRequest.id,
      targetResourceType: 'export',
      metadata: {
        exportType,
        exportFormat,
        exportId: exportRequest.id
      }
    });

    return exportRequest;
  }

  /**
   * Get data export history
   */
  static async getDataExportHistory(userId) {
    return await DataExport.findAll({
      where: { user_id: userId },
      order: [['requested_at', 'DESC']]
    });
  }

  /**
   * Log reference activity
   */
  static async logReferenceActivity({
    userId,
    referenceId,
    actionType,
    description,
    metadata = {}
  }) {
    await this.logEvent({
      userId,
      actionType,
      actionCategory: 'reference',
      description,
      targetResourceId: referenceId,
      targetResourceType: 'reference',
      metadata
    });
  }

  /**
   * Log profile edit
   */
  static async logProfileEdit({
    userId,
    section,
    changes,
    metadata = {}
  }) {
    await this.logEvent({
      userId,
      actionType: 'profile_edit',
      actionCategory: 'profile',
      description: `Updated ${section} section`,
      metadata: {
        section,
        changes,
        ...metadata
      }
    });
  }

  /**
   * Log data access
   */
  static async logDataAccess({
    userId,
    dataType,
    accessType,
    metadata = {}
  }) {
    await this.logEvent({
      userId,
      actionType: 'data_access',
      actionCategory: 'data',
      description: `${accessType} access to ${dataType}`,
      metadata: {
        dataType,
        accessType,
        ...metadata
      }
    });
  }
}

export default AuditService;
