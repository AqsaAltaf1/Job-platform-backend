import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
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
      key: 'id'
    }
  },
  action_type: {
    type: DataTypes.ENUM(
      'profile_view',
      'profile_edit',
      'reference_submission',
      'reference_approval',
      'reference_visibility_change',
      'reference_outdated_toggle',
      'reference_removal',
      'data_access',
      'data_export',
      'privacy_setting_change',
      'consent_given',
      'consent_withdrawn',
      'third_party_share',
      'application_submission',
      'application_status_change',
      'work_verification_request',
      'work_verification_completed'
    ),
    allowNull: false
  },
  action_category: {
    type: DataTypes.ENUM('profile', 'reference', 'privacy', 'application', 'verification', 'data'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  target_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  target_resource_id: {
    type: DataTypes.STRING,
    allowNull: true // For references, applications, etc.
  },
  target_resource_type: {
    type: DataTypes.ENUM('reference', 'application', 'profile', 'work_history', 'document', 'export'),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  performed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action_type']
    },
    {
      fields: ['action_category']
    },
    {
      fields: ['target_user_id']
    },
    {
      fields: ['performed_at']
    },
    {
      fields: ['user_id', 'performed_at']
    },
    {
      fields: ['action_type', 'performed_at']
    }
  ]
});

// Define associations
AuditLog.associate = (models) => {
  AuditLog.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  AuditLog.belongsTo(models.User, {
    foreignKey: 'target_user_id',
    as: 'targetUser'
  });
};

export default AuditLog;
