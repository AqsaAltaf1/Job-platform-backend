import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const SkillEvidence = sequelize.define('SkillEvidence', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  enhanced_skill_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'enhanced_skills',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM('work_sample', 'github_repo', 'portfolio_link', 'certification', 'project'),
    allowNull: false,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verified_by: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'skill_evidence',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
