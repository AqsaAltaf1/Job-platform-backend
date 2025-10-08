import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const ReviewerInvitation = sequelize.define('ReviewerInvitation', {
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
  reviewer_email: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  reviewer_name: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  skills_to_review: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    get() {
      const rawValue = this.getDataValue('skills_to_review');
      return rawValue ? (typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue) : [];
    },
    set(value) {
      this.setDataValue('skills_to_review', JSON.stringify(value));
    },
  },
  invitation_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'completed', 'expired'),
    defaultValue: 'pending',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'reviewer_invitations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
