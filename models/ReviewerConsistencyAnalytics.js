import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReviewerConsistencyAnalytics = sequelize.define('ReviewerConsistencyAnalytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reviewer_email: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  standard_deviation: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  consistency_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  is_consistent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  issues_detected: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: []
  },
  last_analyzed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'reviewer_consistency_analytics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['reviewer_email']
    },
    {
      fields: ['last_analyzed_at']
    },
    {
      fields: ['consistency_score']
    }
  ]
});

export default ReviewerConsistencyAnalytics;
