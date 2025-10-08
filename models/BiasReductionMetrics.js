import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BiasReductionMetrics = sequelize.define('BiasReductionMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  metric_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['anonymization_rate', 'consistency_score', 'sentiment_balance', 'reviewer_fairness']]
    }
  },
  metric_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  },
  metric_period: {
    type: DataTypes.STRING(20),
    defaultValue: 'daily',
    validate: {
      isIn: [['daily', 'weekly', 'monthly']]
    }
  },
  total_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  success_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'bias_reduction_metrics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['metric_type', 'metric_period']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default BiasReductionMetrics;
