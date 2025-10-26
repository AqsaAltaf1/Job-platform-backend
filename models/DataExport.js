import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DataExport = sequelize.define('DataExport', {
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
  export_type: {
    type: DataTypes.ENUM('profile_data', 'audit_log', 'references', 'applications', 'complete_data'),
    allowNull: false
  },
  export_format: {
    type: DataTypes.ENUM('json', 'csv', 'pdf'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  requested_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'data_exports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['export_type']
    },
    {
      fields: ['requested_at']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Define associations
DataExport.associate = (models) => {
  DataExport.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

export default DataExport;
