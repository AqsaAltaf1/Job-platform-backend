import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Reference = sequelize.define('Reference', {
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
  invitation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'reference_invitations',
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
  relationship: {
    type: DataTypes.ENUM('former_manager', 'colleague', 'client', 'mentor', 'other'),
    allowNull: false
  },
  relationship_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  overall_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  work_quality_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  communication_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  reliability_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  teamwork_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  reference_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  strengths: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  areas_for_improvement: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  would_recommend: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  would_hire_again: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  years_worked_together: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  last_worked_together: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'declined'),
    allowNull: false,
    defaultValue: 'pending'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'professional_references',
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
      fields: ['status']
    }
  ]
});

// Define associations
Reference.associate = (models) => {
  Reference.belongsTo(models.User, {
    foreignKey: 'candidate_id',
    as: 'candidate'
  });
};

export default Reference;
