import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ReferenceInvitation = sequelize.define('ReferenceInvitation', {
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
  reviewer_email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  reviewer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'declined', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  declined_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminder_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'reference_invitations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['candidate_id']
    },
    {
      fields: ['reviewer_email']
    },
    {
      fields: ['token'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// Define associations
ReferenceInvitation.associate = (models) => {
  ReferenceInvitation.belongsTo(models.User, {
    foreignKey: 'candidate_id',
    as: 'candidate'
  });
  
  ReferenceInvitation.hasOne(models.Reference, {
    foreignKey: 'invitation_id',
    as: 'reference'
  });
};

export default ReferenceInvitation;
