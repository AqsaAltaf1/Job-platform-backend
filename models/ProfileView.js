import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ProfileView = sequelize.define('ProfileView', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  candidate_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  viewer_id: {
    type: DataTypes.UUID,
    allowNull: true, // null for anonymous views
    references: {
      model: 'users',
      key: 'id'
    }
  },
  viewer_type: {
    type: DataTypes.ENUM('employer', 'recruiter', 'anonymous', 'candidate'),
    allowNull: false
  },
  viewer_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  viewer_company: {
    type: DataTypes.STRING,
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
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'profile_views',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['candidate_id']
    },
    {
      fields: ['viewer_id']
    },
    {
      fields: ['viewed_at']
    },
    {
      fields: ['candidate_id', 'viewed_at']
    }
  ]
});

// Define associations
ProfileView.associate = (models) => {
  ProfileView.belongsTo(models.User, {
    foreignKey: 'candidate_id',
    as: 'candidate'
  });
  ProfileView.belongsTo(models.User, {
    foreignKey: 'viewer_id',
    as: 'viewer'
  });
};

export default ProfileView;
