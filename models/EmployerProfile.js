import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const EmployerProfile = sequelize.define('EmployerProfile', {
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
  profile_picture_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Employer-specific fields
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Company Information
  company_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_legal_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_display_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  company_logo_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  company_website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  careers_page_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_industry: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_sector: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company_size: {
    type: DataTypes.ENUM,
    values: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'],
    allowNull: true,
  },
  company_location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  headquarters_location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  remote_policy: {
    type: DataTypes.ENUM,
    values: ['on-site', 'remote', 'hybrid', 'flexible'],
    allowNull: true,
  },
  // Account ownership
  is_primary_owner: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  account_role: {
    type: DataTypes.ENUM,
    values: ['primary_owner', 'hr_manager', 'recruiter', 'interviewer', 'admin'],
    defaultValue: 'primary_owner',
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      can_post_jobs: true,
      can_view_applications: true,
      can_interview_candidates: true,
      can_manage_team: true,
      can_access_analytics: true,
      can_manage_company_profile: true,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'employer_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})

export default EmployerProfile
