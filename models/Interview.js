import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  application_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'job_applications',
      key: 'id'
    }
  },
  interviewer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id'
    }
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  interview_type: {
    type: DataTypes.ENUM('phone', 'video', 'in_person'),
    allowNull: false,
    defaultValue: 'video'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60, // minutes
    validate: {
      min: 15,
      max: 480 // 8 hours max
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  meeting_link: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'interviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['application_id']
    },
    {
      fields: ['interviewer_id']
    },
    {
      fields: ['job_id']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['status']
    },
    {
      fields: ['interview_type']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Interview;
