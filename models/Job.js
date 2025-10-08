import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employer_profile_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'employer_profiles',
      key: 'id'
    }
  },
  posted_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  responsibilities: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  job_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'internship', 'temporary'),
    allowNull: false,
    defaultValue: 'full_time'
  },
  work_arrangement: {
    type: DataTypes.ENUM('remote', 'on_site', 'hybrid'),
    allowNull: false,
    defaultValue: 'on_site'
  },
  experience_level: {
    type: DataTypes.ENUM('entry_level', 'mid_level', 'senior_level', 'executive'),
    allowNull: false,
    defaultValue: 'mid_level'
  },
  salary_min: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  salary_max: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  salary_currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD'
  },
  salary_period: {
    type: DataTypes.ENUM('hourly', 'monthly', 'yearly'),
    allowNull: true,
    defaultValue: 'yearly'
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  skills_required: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  application_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'closed', 'filled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  views_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  applications_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
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
  tableName: 'jobs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['employer_profile_id']
    },
    {
      fields: ['posted_by']
    },
    {
      fields: ['status']
    },
    {
      fields: ['job_type']
    },
    {
      fields: ['work_arrangement']
    },
    {
      fields: ['experience_level']
    },
    {
      fields: ['location']
    },
    {
      fields: ['department']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['application_deadline']
    }
  ]
});

export default Job;
