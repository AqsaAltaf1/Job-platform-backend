import biasReductionService from '../services/biasReductionService.js';
import BiasReductionLog from '../models/BiasReductionLog.js';
import ReviewerConsistencyAnalytics from '../models/ReviewerConsistencyAnalytics.js';
import BiasReductionMetrics from '../models/BiasReductionMetrics.js';
import PeerEndorsement from '../models/PeerEndorsement.js';
import { Op } from 'sequelize';

/**
 * Process endorsement text through bias reduction pipeline
 */
const processEndorsementText = async (req, res) => {
  try {
    const { endorsementId, text, processingType = 'full_pipeline' } = req.body;

    if (!endorsementId || !text) {
      return res.status(400).json({
        success: false,
        message: 'Endorsement ID and text are required'
      });
    }

    const startTime = Date.now();
    let processedText = text;
    let errorMessage = null;

    try {
      // Apply bias reduction based on processing type
      switch (processingType) {
        case 'anonymization':
          processedText = await biasReductionService.anonymizeText(text);
          break;
        case 'sentiment_normalization':
          processedText = await biasReductionService.normalizeSentiment(text);
          break;
        case 'full_pipeline':
          const processedData = await biasReductionService.processEndorsement({ endorsement_text: text });
          processedText = processedData.endorsement_text;
          break;
        default:
          throw new Error('Invalid processing type');
      }

      const processingTime = Date.now() - startTime;

      // Log the processing
      await BiasReductionLog.create({
        endorsement_id: endorsementId,
        original_text: text,
        anonymized_text: processingType === 'anonymization' || processingType === 'full_pipeline' ? processedText : null,
        normalized_text: processingType === 'sentiment_normalization' || processingType === 'full_pipeline' ? processedText : null,
        processing_type: processingType,
        processing_status: 'completed',
        processing_time_ms: processingTime
      });

      res.json({
        success: true,
        data: {
          original_text: text,
          processed_text: processedText,
          processing_type: processingType,
          processing_time_ms: processingTime
        }
      });

    } catch (processingError) {
      const processingTime = Date.now() - startTime;
      errorMessage = processingError.message;

      // Log the error
      await BiasReductionLog.create({
        endorsement_id: endorsementId,
        original_text: text,
        processing_type: processingType,
        processing_status: 'failed',
        error_message: errorMessage,
        processing_time_ms: processingTime
      });

      throw processingError;
    }

  } catch (error) {
    console.error('Error processing endorsement text:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing endorsement text',
      error: error.message
    });
  }
};

/**
 * Analyze reviewer consistency
 */
const analyzeReviewerConsistency = async (req, res) => {
  try {
    const { reviewerEmail } = req.params;

    if (!reviewerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Reviewer email is required'
      });
    }

    // Get all endorsements by this reviewer
    const endorsements = await PeerEndorsement.findAll({
      where: {
        endorser_email: reviewerEmail,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    // Check consistency
    const consistencyResult = await biasReductionService.checkReviewerConsistency(reviewerEmail, endorsements);

    // Update or create analytics record
    await ReviewerConsistencyAnalytics.upsert({
      reviewer_email: reviewerEmail,
      total_reviews: endorsements.length,
      average_rating: consistencyResult.averageRating,
      standard_deviation: consistencyResult.standardDeviation,
      consistency_score: consistencyResult.consistencyScore,
      is_consistent: consistencyResult.isConsistent,
      issues_detected: consistencyResult.issues || [],
      last_analyzed_at: new Date()
    });

    res.json({
      success: true,
      data: {
        reviewer_email: reviewerEmail,
        ...consistencyResult,
        total_endorsements: endorsements.length
      }
    });

  } catch (error) {
    console.error('Error analyzing reviewer consistency:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing reviewer consistency',
      error: error.message
    });
  }
};

/**
 * Get bias reduction analytics
 */
const getBiasReductionAnalytics = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;

    // Get processing logs
    const processingLogs = await BiasReductionLog.findAll({
      where: {
        is_active: true,
        created_at: {
          [Op.gte]: new Date(Date.now() - (limit * 24 * 60 * 60 * 1000))
        }
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    // Get reviewer consistency analytics
    const consistencyAnalytics = await ReviewerConsistencyAnalytics.findAll({
      where: {
        is_active: true
      },
      order: [['last_analyzed_at', 'DESC']]
    });

    // Get bias reduction metrics
    const metrics = await BiasReductionMetrics.findAll({
      where: {
        is_active: true,
        metric_period: period
      },
      order: [['created_at', 'DESC']]
    });

    // Calculate summary statistics
    const totalProcessed = processingLogs.length;
    const successfulProcessing = processingLogs.filter(log => log.processing_status === 'completed').length;
    const successRate = totalProcessed > 0 ? (successfulProcessing / totalProcessed) * 100 : 0;

    const averageConsistencyScore = consistencyAnalytics.length > 0 
      ? consistencyAnalytics.reduce((sum, analytics) => sum + (analytics.consistency_score || 0), 0) / consistencyAnalytics.length
      : 0;

    const inconsistentReviewers = consistencyAnalytics.filter(analytics => !analytics.is_consistent).length;

    res.json({
      success: true,
      data: {
        summary: {
          total_processed: totalProcessed,
          success_rate: parseFloat(successRate.toFixed(2)),
          average_consistency_score: parseFloat(averageConsistencyScore.toFixed(2)),
          inconsistent_reviewers: inconsistentReviewers,
          total_reviewers: consistencyAnalytics.length
        },
        processing_logs: processingLogs,
        consistency_analytics: consistencyAnalytics,
        metrics: metrics
      }
    });

  } catch (error) {
    console.error('Error getting bias reduction analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting bias reduction analytics',
      error: error.message
    });
  }
};

/**
 * Batch process endorsements for bias reduction
 */
const batchProcessEndorsements = async (req, res) => {
  try {
    const { endorsementIds } = req.body;

    if (!endorsementIds || !Array.isArray(endorsementIds)) {
      return res.status(400).json({
        success: false,
        message: 'Array of endorsement IDs is required'
      });
    }

    // Get endorsements
    const endorsements = await PeerEndorsement.findAll({
      where: {
        id: endorsementIds,
        is_active: true
      }
    });

    if (endorsements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No endorsements found'
      });
    }

    // Process endorsements
    const processedEndorsements = await biasReductionService.processEndorsements(endorsements);

    // Update endorsements in database
    const updatePromises = processedEndorsements.map(async (endorsement) => {
      if (endorsement.endorsement_text && endorsement.bias_reduction_applied) {
        await PeerEndorsement.update(
          { 
            endorsement_text: endorsement.endorsement_text,
            updated_at: new Date()
          },
          { 
            where: { id: endorsement.id }
          }
        );
      }
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      data: {
        total_processed: processedEndorsements.length,
        processed_endorsements: processedEndorsements.map(e => ({
          id: e.id,
          bias_reduction_applied: e.bias_reduction_applied,
          bias_reduction_timestamp: e.bias_reduction_timestamp
        }))
      }
    });

  } catch (error) {
    console.error('Error batch processing endorsements:', error);
    res.status(500).json({
      success: false,
      message: 'Error batch processing endorsements',
      error: error.message
    });
  }
};

/**
 * Get reviewer consistency report
 */
const getReviewerConsistencyReport = async (req, res) => {
  try {
    const { minReviews = 3 } = req.query;

    const analytics = await ReviewerConsistencyAnalytics.findAll({
      where: {
        is_active: true,
        total_reviews: {
          [Op.gte]: parseInt(minReviews)
        }
      },
      order: [['consistency_score', 'ASC']] // Show least consistent first
    });

    const report = {
      total_reviewers: analytics.length,
      consistent_reviewers: analytics.filter(a => a.is_consistent).length,
      inconsistent_reviewers: analytics.filter(a => !a.is_consistent).length,
      average_consistency_score: analytics.length > 0 
        ? analytics.reduce((sum, a) => sum + (a.consistency_score || 0), 0) / analytics.length 
        : 0,
      reviewers: analytics.map(analytics => ({
        reviewer_email: analytics.reviewer_email,
        total_reviews: analytics.total_reviews,
        average_rating: analytics.average_rating,
        consistency_score: analytics.consistency_score,
        is_consistent: analytics.is_consistent,
        issues_detected: analytics.issues_detected,
        last_analyzed_at: analytics.last_analyzed_at
      }))
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error getting reviewer consistency report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting reviewer consistency report',
      error: error.message
    });
  }
};

export {
  processEndorsementText,
  analyzeReviewerConsistency,
  getBiasReductionAnalytics,
  batchProcessEndorsements,
  getReviewerConsistencyReport
};
