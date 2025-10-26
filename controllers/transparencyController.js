import AuditService from '../services/auditService.js';
import { ProfileView, Reference, ReferenceInvitation, User, DataExport } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get comprehensive transparency data
 */
export const getComprehensiveTransparencyData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Get analytics data
    const analytics = await AuditService.getTransparencyAnalytics(userId, parseInt(days));

    // Get activity timeline
    const timeline = await AuditService.getActivityTimeline(userId, parseInt(days));

    // Get privacy settings
    const privacySettings = await AuditService.getPrivacySettings(userId);

    // Get data export history
    const exportHistory = await AuditService.getDataExportHistory(userId);
    console.log('📦 Export history fetched:', exportHistory.length, 'exports');

    res.json({
      success: true,
      data: {
        analytics,
        timeline,
        privacySettings,
        exportHistory,
        summary: {
          totalProfileViews: analytics.totalProfileViews,
          totalActivities: analytics.totalActivities,
          activePrivacySettings: Object.keys(privacySettings).length,
          totalExports: exportHistory.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive transparency data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transparency data',
      error: error.message
    });
  }
};

/**
 * Get detailed audit log
 */
export const getAuditLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      startDate,
      endDate,
      actionTypes,
      actionCategories,
      limit = 100,
      offset = 0
    } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      actionTypes: actionTypes ? actionTypes.split(',') : [],
      actionCategories: actionCategories ? actionCategories.split(',') : [],
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const auditLog = await AuditService.getAuditLog(userId, options);

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
};

/**
 * Get activity analytics
 */
export const getActivityAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const analytics = await AuditService.getTransparencyAnalytics(userId, parseInt(days));

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching activity analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity analytics',
      error: error.message
    });
  }
};

/**
 * Get user privacy settings
 */
export const getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const privacySettings = await AuditService.getPrivacySettings(userId);

    res.json({
      success: true,
      data: privacySettings
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch privacy settings',
      error: error.message
    });
  }
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { settings } = req.body;

    const updatedSettings = {};

    for (const [settingType, settingValue] of Object.entries(settings)) {
      const setting = await AuditService.createPrivacySetting({
        userId,
        settingType,
        settingValue,
        createdBy: userId
      });
      updatedSettings[settingType] = setting.setting_value;
    }

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings',
      error: error.message
    });
  }
};

/**
 * Request data export
 */
export const requestDataExport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportType, exportFormat = 'json' } = req.body;

    const exportRequest = await AuditService.requestDataExport({
      userId,
      exportType,
      exportFormat
    });

    res.json({
      success: true,
      message: 'Data export requested successfully',
      data: exportRequest
    });
  } catch (error) {
    console.error('Error requesting data export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request data export',
      error: error.message
    });
  }
};

/**
 * Get data export history
 */
export const getDataExportHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const exportHistory = await AuditService.getDataExportHistory(userId);

    res.json({
      success: true,
      data: exportHistory
    });
  } catch (error) {
    console.error('Error fetching data export history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data export history',
      error: error.message
    });
  }
};

/**
 * Get reference activity log
 */
export const getReferenceActivityLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get reference-related audit logs
    const referenceActivities = await AuditService.getAuditLog(userId, {
      actionCategories: ['reference'],
      startDate,
      limit: 1000
    });

    // Get reference submissions and completions
    const references = await Reference.findAll({
      where: {
        candidate_id: userId,
        created_at: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: ReferenceInvitation,
          as: 'invitation',
          attributes: ['id', 'referrer_name', 'referrer_email', 'status', 'created_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        activities: referenceActivities,
        references,
        summary: {
          totalActivities: referenceActivities.length,
          totalReferences: references.length,
          completedReferences: references.filter(r => r.invitation?.status === 'completed').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reference activity log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reference activity log',
      error: error.message
    });
  }
};

/**
 * Export audit data
 */
export const exportAuditData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', days = 30, exportId } = req.query;

    console.log('🔄 Export request:', { userId, format, days, exportId });

    // If exportId is provided, get the specific export request and mark it as processing
    let exportRequest = null;
    if (exportId) {
      exportRequest = await DataExport.findOne({
        where: {
          id: exportId,
          user_id: userId,
          status: 'pending'
        }
      });

      if (!exportRequest) {
        console.log('❌ Export not found or already processed:', exportId);
        return res.status(404).json({
          success: false,
          message: 'Export not found or already processed'
        });
      }

      console.log('✅ Found export request, marking as processing');
      // Mark as processing
      await exportRequest.update({ 
        status: 'processing',
        completed_at: new Date()
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log('📊 Fetching audit log and analytics...');
    const auditLog = await AuditService.getAuditLog(userId, {
      startDate,
      limit: 10000
    });

    const analytics = await AuditService.getTransparencyAnalytics(userId, parseInt(days));

    console.log('📈 Data fetched:', { 
      auditLogCount: auditLog.length, 
      analyticsKeys: Object.keys(analytics) 
    });

    const exportData = {
      exportInfo: {
        userId,
        exportDate: new Date().toISOString(),
        period: `${days} days`,
        format,
        exportId: exportId || null
      },
      auditLog,
      analytics: {
        summary: analytics.activityStats,
        dailyStats: analytics.dailyStats
      }
    };

    // Mark export as completed if we have an export request
    if (exportRequest) {
      console.log('✅ Marking export as completed');
      await exportRequest.update({ 
        status: 'completed',
        completed_at: new Date()
      });
    }

    if (format === 'csv') {
      console.log('📄 Converting to CSV format...');
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      console.log('📄 CSV data length:', csvData.length);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-data-${exportId || userId}-${Date.now()}.csv"`);
      res.setHeader('Content-Length', csvData.length);
      res.send(csvData);
    } else if (format === 'pdf') {
      console.log('📄 Converting to PDF format...');
      // Convert to PDF format
      const pdfData = convertToPDF(exportData);
      console.log('📄 PDF data length:', pdfData.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="audit-data-${exportId || userId}-${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfData.length);
      res.send(pdfData);
    } else {
      console.log('📄 Returning JSON format...');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-data-${exportId || userId}-${Date.now()}.json"`);
      res.json(exportData);
    }
    
    console.log('✅ Export completed successfully');
  } catch (error) {
    console.error('❌ Error exporting audit data:', error);
    
    // Mark export as failed if we have an export request
    if (req.query.exportId) {
      try {
        const exportRequest = await DataExport.findOne({
          where: {
            id: req.query.exportId,
            user_id: req.user.id
          }
        });
        if (exportRequest) {
          await exportRequest.update({ status: 'failed' });
        }
      } catch (updateError) {
        console.error('Error updating export status to failed:', updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to export audit data',
      error: error.message
    });
  }
};

/**
 * Convert audit data to CSV format
 */
function convertToCSV(data) {
  const headers = [
    'Date',
    'Action Type',
    'Action Category',
    'Description',
    'Target User',
    'Target Resource',
    'Metadata'
  ];

  const rows = data.auditLog.map(log => [
    log.performed_at.toISOString(),
    log.action_type,
    log.action_category,
    log.description,
    log.targetUser ? `${log.targetUser.first_name} ${log.targetUser.last_name}` : '',
    log.target_resource_id || '',
    JSON.stringify(log.metadata || {})
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Convert audit data to PDF format
 */
function convertToPDF(data) {
  // Simple PDF generation using basic HTML to PDF conversion
  // For production, you might want to use a proper PDF library like puppeteer or jsPDF
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Audit Data Export</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metadata { font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>Audit Data Export Report</h1>
      
      <div class="summary">
        <h2>Export Information</h2>
        <p><strong>Export Date:</strong> ${data.exportInfo.exportDate}</p>
        <p><strong>Period:</strong> ${data.exportInfo.period}</p>
        <p><strong>Format:</strong> ${data.exportInfo.format}</p>
        <p><strong>User ID:</strong> ${data.exportInfo.userId}</p>
      </div>

      <h2>Activity Summary</h2>
      <table>
        <tr><th>Action Type</th><th>Count</th></tr>
        ${Object.entries(data.analytics.summary).map(([action, count]) => 
          `<tr><td>${action}</td><td>${count}</td></tr>`
        ).join('')}
      </table>

      <h2>Detailed Audit Log</h2>
      <table>
        <tr>
          <th>Date</th>
          <th>Action Type</th>
          <th>Action Category</th>
          <th>Description</th>
          <th>Target User</th>
          <th>Metadata</th>
        </tr>
        ${data.auditLog.map(log => `
          <tr>
            <td>${log.performed_at ? new Date(log.performed_at).toLocaleString() : 'N/A'}</td>
            <td>${log.action_type || 'N/A'}</td>
            <td>${log.action_category || 'N/A'}</td>
            <td>${log.description || 'N/A'}</td>
            <td>${log.targetUser ? `${log.targetUser.first_name} ${log.targetUser.last_name}` : 'N/A'}</td>
            <td class="metadata">${JSON.stringify(log.metadata || {})}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;

  // For now, return HTML content that can be converted to PDF by the client
  // In production, you would use a proper PDF generation library
  return Buffer.from(htmlContent, 'utf8');
}
