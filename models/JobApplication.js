import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const JobApplication = sequelize.define('JobApplication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id'
    }
  },
  candidate_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  candidate_profile_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'candidate_profiles',
      key: 'id'
    }
  },
  cover_letter: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resume_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  portfolio_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  expected_salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  salary_currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD'
  },
  availability_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'),
    allowNull: false,
    defaultValue: 'pending'
  },
  application_source: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'direct'
  },
  screening_answers: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  interview_scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  interview_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'job_applications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['job_id']
    },
    {
      fields: ['candidate_id']
    },
    {
      fields: ['candidate_profile_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['reviewed_by']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['interview_scheduled_at']
    },
    {
      unique: true,
      fields: ['job_id', 'candidate_id']
    }
  ]
});

export default JobApplication;
