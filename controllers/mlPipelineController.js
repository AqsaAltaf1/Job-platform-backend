import mlPipelineManager from '../services/mlPipelineManager.js';

/**
 * Train a specific ML model
 */
export const trainModel = async (req, res) => {
  try {
    const { model_name } = req.params;

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for model training'
      });
    }

    let result;
    switch (model_name) {
      case 'candidate_success':
        result = await mlPipelineManager.trainCandidateSuccessModel();
        break;
      case 'job_matching':
        result = await mlPipelineManager.trainMatchingModel();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid model name. Supported models: candidate_success, job_matching'
        });
    }

    if (result.success) {
      res.json({
        success: true,
        message: `Model ${model_name} training completed`,
        model: result.model
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Model training failed'
      });
    }

  } catch (error) {
    console.error('Train model error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Evaluate a specific ML model
 */
export const evaluateModel = async (req, res) => {
  try {
    const { model_name } = req.params;

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for model evaluation'
      });
    }

    const result = await mlPipelineManager.evaluateModel(model_name);

    if (result.success) {
      res.json({
        success: true,
        evaluation: result.evaluation
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Model evaluation failed'
      });
    }

  } catch (error) {
    console.error('Evaluate model error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Deploy a model to production
 */
export const deployModel = async (req, res) => {
  try {
    const { model_name } = req.params;
    const { version } = req.body;

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for model deployment'
      });
    }

    const result = await mlPipelineManager.deployModel(model_name, version);

    if (result.success) {
      res.json({
        success: true,
        message: `Model ${model_name} v${version} deployed successfully`,
        deployment: result.deployment
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Model deployment failed'
      });
    }

  } catch (error) {
    console.error('Deploy model error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get model performance history
 */
export const getModelHistory = async (req, res) => {
  try {
    const { model_name } = req.params;

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for model history'
      });
    }

    const result = await mlPipelineManager.getModelHistory(model_name);

    if (result.success) {
      res.json({
        success: true,
        history: result.history
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get model history'
      });
    }

  } catch (error) {
    console.error('Get model history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Extract training data for a specific model
 */
export const extractTrainingData = async (req, res) => {
  try {
    const { model_name } = req.params;

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for data extraction'
      });
    }

    let result;
    switch (model_name) {
      case 'candidate_success':
        result = await mlPipelineManager.extractCandidateSuccessTrainingData();
        break;
      case 'job_matching':
        result = await mlPipelineManager.extractMatchingTrainingData();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid model name. Supported models: candidate_success, job_matching'
        });
    }

    if (result.success) {
      res.json({
        success: true,
        message: `Training data extracted for ${model_name}`,
        samples: result.samples,
        filePath: result.filePath
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Data extraction failed'
      });
    }

  } catch (error) {
    console.error('Extract training data error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get ML pipeline status and overview
 */
export const getPipelineStatus = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for pipeline status'
      });
    }

    const status = {
      pipeline: {
        status: 'active',
        lastUpdate: new Date(),
        version: '1.0.0'
      },
      models: [
        {
          name: 'candidate_success',
          displayName: 'Candidate Success Predictor',
          status: 'deployed',
          version: '1.1',
          accuracy: 0.87,
          lastTrained: '2024-03-01',
          nextTraining: '2024-04-01'
        },
        {
          name: 'job_matching',
          displayName: 'Job-Candidate Matcher',
          status: 'deployed',
          version: '1.1',
          accuracy: 0.81,
          lastTrained: '2024-03-01',
          nextTraining: '2024-04-01'
        },
        {
          name: 'retention_predictor',
          displayName: 'Employee Retention Predictor',
          status: 'training',
          version: '1.0',
          accuracy: 0.82,
          lastTrained: '2024-02-15',
          nextTraining: '2024-03-15'
        }
      ],
      dataStats: {
        totalApplications: 15420,
        trainingSamples: 12336,
        testSamples: 3084,
        lastDataUpdate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      },
      performance: {
        avgPredictionTime: '1.2s',
        successRate: 0.96,
        dailyPredictions: 150,
        weeklyPredictions: 1050
      }
    };

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Get pipeline status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Trigger automated model retraining
 */
export const triggerRetraining = async (req, res) => {
  try {
    const { models } = req.body; // Array of model names to retrain

    // Check admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for model retraining'
      });
    }

    if (!models || !Array.isArray(models)) {
      return res.status(400).json({
        success: false,
        error: 'Models array is required'
      });
    }

    const results = [];
    
    for (const modelName of models) {
      try {
        let result;
        switch (modelName) {
          case 'candidate_success':
            result = await mlPipelineManager.trainCandidateSuccessModel();
            break;
          case 'job_matching':
            result = await mlPipelineManager.trainMatchingModel();
            break;
          default:
            result = {
              success: false,
              error: `Unsupported model: ${modelName}`
            };
        }

        results.push({
          model: modelName,
          success: result.success,
          error: result.error || null,
          model_info: result.model || null
        });

      } catch (error) {
        results.push({
          model: modelName,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: `Retraining completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Trigger retraining error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
