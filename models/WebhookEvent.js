import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const WebhookEvent = sequelize.define('WebhookEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  stripe_event_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  processing_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  event_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'webhook_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})

export default WebhookEvent
