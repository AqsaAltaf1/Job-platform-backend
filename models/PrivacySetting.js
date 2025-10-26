import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PrivacySetting = sequelize.define('PrivacySetting', {
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
  setting_type: {
    type: DataTypes.ENUM(
      'profile_visibility',
      'reference_visibility',
      'work_history_visibility',
      'contact_info_sharing',
      'data_retention_period',
      'anonymization_level',
      'third_party_sharing',
      'export_permissions',
      'notification_preferences',
      'consent_tracking'
    ),
    allowNull: false
  },
  setting_value: {
    type: DataTypes.JSON,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  effective_from: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  effective_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'privacy_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['setting_type']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['effective_from']
    },
    {
      fields: ['user_id', 'setting_type', 'is_active']
    }
  ]
});

// Define associations
PrivacySetting.associate = (models) => {
  PrivacySetting.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  PrivacySetting.belongsTo(models.User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
};

export default PrivacySetting;
