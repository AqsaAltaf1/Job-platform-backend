import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const TeamMember = sequelize.define('TeamMember', {
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
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true, // null until they accept invitation
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  role: {
    type: DataTypes.ENUM,
    values: ['primary_owner', 'hr_manager', 'recruiter', 'interviewer', 'admin'],
    allowNull: false,
    defaultValue: 'recruiter',
  },
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      can_post_jobs: false,
      can_view_applications: false,
      can_interview_candidates: false,
      can_manage_team: false,
      can_access_analytics: false,
      can_manage_company_profile: false,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  job_title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  invited_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'team_members',
      key: 'id',
    },
  },
  invitation_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  invitation_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invited_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invitation_status: {
    type: DataTypes.ENUM,
    values: ['pending', 'accepted', 'expired', 'cancelled'],
    defaultValue: 'pending',
  },
  last_active_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'team_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['employer_profile_id'],
    },
    {
      fields: ['email'],
    },
    {
      fields: ['role'],
    },
    {
      unique: true,
      fields: ['employer_profile_id', 'email'],
    },
  ],
})

export default TeamMember
