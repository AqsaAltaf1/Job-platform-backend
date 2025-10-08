import { WebhookEvent } from '../models/WebhookEvent.js';
import { Op } from 'sequelize';

/**
 * Get webhook events for admin dashboard
 */
export const getWebhookEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, event_type } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    
    if (status === 'processed') {
      whereClause.processed = true;
      whereClause.processing_error = null;
    } else if (status === 'failed') {
      whereClause[Op.or] = [
        { processed: false },
        { processing_error: { [Op.ne]: null } }
      ];
    } else if (status === 'pending') {
      whereClause.processed = false;
      whereClause.processing_error = null;
    }

    if (event_type) {
      whereClause.event_type = { [Op.like]: `%${event_type}%` };
    }

    const { count, rows: events } = await WebhookEvent.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      events,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook events'
    });
  }
};

/**
 * Get webhook event by ID
 */
export const getWebhookEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await WebhookEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Webhook event not found'
      });
    }

    res.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Get webhook event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook event'
    });
  }
};

/**
 * Retry failed webhook event
 */
export const retryWebhookEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await WebhookEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Webhook event not found'
      });
    }

    if (event.processed && !event.processing_error) {
      return res.status(400).json({
        success: false,
        error: 'Event is already processed successfully'
      });
    }

    // Reset processing status
    await event.update({
      processed: false,
      processing_error: null,
      processed_at: null
    });

    // Import stripe service and retry processing
    const stripeService = (await import('../services/stripeService.js')).default;
    
    // Create a mock event object for retry
    const mockEvent = {
      id: event.stripe_event_id,
      type: event.event_type,
      data: event.event_data,
      created: Math.floor(new Date(event.created_at).getTime() / 1000)
    };

    // Retry processing
    await stripeService.handleWebhook(mockEvent);

    res.json({
      success: true,
      message: 'Webhook event retry initiated'
    });

  } catch (error) {
    console.error('Retry webhook event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry webhook event'
    });
  }
};

/**
 * Get webhook statistics
 */
export const getWebhookStats = async (req, res) => {
  try {
    const stats = await WebhookEvent.findAll({
      attributes: [
        'event_type',
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.col('id')), 'count'],
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.literal('CASE WHEN processed = true AND processing_error IS NULL THEN 1 END')), 'processed_count'],
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.literal('CASE WHEN processed = false OR processing_error IS NOT NULL THEN 1 END')), 'failed_count']
      ],
      group: ['event_type'],
      order: [[WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.col('id')), 'DESC']]
    });

    const totalStats = await WebhookEvent.findAll({
      attributes: [
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.col('id')), 'total'],
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.literal('CASE WHEN processed = true AND processing_error IS NULL THEN 1 END')), 'processed'],
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.literal('CASE WHEN processed = false OR processing_error IS NOT NULL THEN 1 END')), 'failed'],
        [WebhookEvent.sequelize.fn('COUNT', WebhookEvent.sequelize.literal('CASE WHEN processed = false AND processing_error IS NULL THEN 1 END')), 'pending']
      ]
    });

    res.json({
      success: true,
      stats: {
        by_type: stats,
        totals: totalStats[0] || { total: 0, processed: 0, failed: 0, pending: 0 }
      }
    });

  } catch (error) {
    console.error('Get webhook stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook statistics'
    });
  }
};
