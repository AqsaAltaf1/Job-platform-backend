import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const Education = sequelize.define('Education', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_profile_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'candidate_profiles',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  institution_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  degree: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  field_of_study: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_current: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gpa: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
  },
  activities: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'educations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})

export default Education
