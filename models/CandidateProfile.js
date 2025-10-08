import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const CandidateProfile = sequelize.define('CandidateProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  job_title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  linkedin_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  github_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profile_picture_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Candidate-specific fields
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('skills');
      if (!rawValue) return [];
      if (typeof rawValue === 'string') {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      }
      return rawValue;
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('skills', value);
      } else {
        this.setDataValue('skills', []);
      }
    },
  },
  experience_years: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  education: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resume_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  portfolio_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salary_expectation: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  availability: {
    type: DataTypes.ENUM('immediate', '2-weeks', '1-month', 'not-available'),
    allowNull: true,
    defaultValue: 'immediate',
  },
  date_of_birth: {
    type: DataTypes.DATEONLY, // YYYY-MM-DD format
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING(2), // ISO country code (US, GB, etc.)
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'candidate_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})

export default CandidateProfile
