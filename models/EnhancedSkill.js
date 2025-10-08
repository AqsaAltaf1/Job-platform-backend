import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const EnhancedSkill = sequelize.define('EnhancedSkill', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  candidate_profile_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'candidate_profiles',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  taxonomy_source: {
    type: DataTypes.ENUM('ESCO', 'O*NET', 'custom'),
    defaultValue: 'custom',
  },
  taxonomy_id: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    allowNull: false, // Set by candidate
  },
  years_experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verified_rating: {
    type: DataTypes.DECIMAL(2, 1), // e.g., 4.2
    allowNull: true,
    validate: {
      min: 1.0,
      max: 5.0,
    },
  },
  skill_rating: {
    type: DataTypes.DECIMAL(3, 2), // e.g., 4.25 (average of endorser ratings)
    allowNull: true,
    validate: {
      min: 1.0,
      max: 5.0,
    },
    get() {
      const value = this.getDataValue('skill_rating');
      return value ? parseFloat(value) : null;
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'enhanced_skills',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
