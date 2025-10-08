import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  employer_profile_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employer_profiles',
      key: 'id'
    }
  },
  subscription_plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscription_plans',
      key: 'id'
    }
  },
  stripe_subscription_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'paused'
    ),
    allowNull: false,
    defaultValue: 'incomplete'
  },
  billing_cycle: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: false
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: false
  },
  trial_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trial_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  canceled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancel_at_period_end: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['employer_profile_id']
    },
    {
      fields: ['subscription_plan_id']
    },
    {
      fields: ['stripe_subscription_id']
    },
    {
      fields: ['stripe_customer_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['current_period_end']
    }
  ]
});

export default Subscription;
