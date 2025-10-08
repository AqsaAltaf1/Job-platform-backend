import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PeerEndorsement = sequelize.define('PeerEndorsement', {
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
  endorser_name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  endorser_email: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  endorser_position: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  endorser_company: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  relationship: {
    type: DataTypes.ENUM('colleague', 'manager', 'client', 'peer', 'other'),
    allowNull: false,
  },
  endorsement_text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  skill_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    allowNull: false,
  },
  star_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'peer_endorsements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default PeerEndorsement;
