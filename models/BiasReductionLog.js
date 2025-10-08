import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BiasReductionLog = sequelize.define('BiasReductionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  endorsement_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'peer_endorsements',
      key: 'id'
    }
  },
  original_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  anonymized_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  normalized_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processing_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['anonymization', 'sentiment_normalization', 'full_pipeline']]
    }
  },
  processing_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'completed',
    validate: {
      isIn: [['completed', 'failed', 'skipped']]
    }
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processing_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'bias_reduction_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['endorsement_id']
    },
    {
      fields: ['processing_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default BiasReductionLog;
