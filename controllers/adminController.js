import stripeService from '../services/stripeService.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

/**
 * Check if user has admin permissions
 */
const checkAdminPermission = async (userId, permission) => {
  const admin = await Admin.findOne({
    where: { 
      user_id: userId,
      status: 'active'
    }
  });

  if (!admin) return false;
  
  if (admin.admin_level === 'super_admin') return true;
  
  return admin.permissions[permission] === true;
};

/**
 * Get all subscription plans (Admin view with more details)
 */
export const getAdminSubscriptionPlans = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_packages');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const plans = await SubscriptionPlan.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get admin subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
};

/**
 * Create new subscription plan
 */
export const createSubscriptionPlan = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_packages');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const {
      name,
      display_name,
      description,
      price_monthly,
      price_yearly,
      features = {},
      limits = {},
      is_popular = false,
      sort_order = 0
    } = req.body;

    // Validate required fields
    if (!name || !display_name || !price_monthly || !price_yearly) {
      return res.status(400).json({
        success: false,
        error: 'Name, display name, monthly price, and yearly price are required'
      });
    }

    // Check if plan name already exists
    const existingPlan = await SubscriptionPlan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        error: 'Plan name already exists'
      });
    }

    // Create Stripe product
    const stripeProduct = await stripeService.stripe.products.create({
      name: display_name,
      description: description || '',
      metadata: {
        plan_name: name,
        created_by: req.user.id
      }
    });

    // Create Stripe prices
    const stripeMonthlyPrice = await stripeService.stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(parseFloat(price_monthly) * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_name: name,
        billing_cycle: 'monthly'
      }
    });

    const stripeYearlyPrice = await stripeService.stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(parseFloat(price_yearly) * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        plan_name: name,
        billing_cycle: 'yearly'
      }
    });

    // Create subscription plans in database (separate for monthly and yearly)
    const monthlyPlan = await SubscriptionPlan.create({
      name: `${name} (Monthly)`,
      display_name: `${display_name} (Monthly)`,
      description,
      billing_cycle: 'monthly',
      price: parseFloat(price_monthly),
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripeMonthlyPrice.id,
      features,
      limits,
      is_popular,
      sort_order: parseInt(sort_order),
      is_active: true
    });

    const yearlyPlan = await SubscriptionPlan.create({
      name: `${name} (Yearly)`,
      display_name: `${display_name} (Yearly)`,
      description,
      billing_cycle: 'yearly',
      price: parseFloat(price_yearly),
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripeYearlyPrice.id,
      features,
      limits,
      is_popular,
      sort_order: parseInt(sort_order) + 1,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plans created successfully',
      plans: [monthlyPlan, yearlyPlan]
    });

  } catch (error) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription plan'
    });
  }
};

/**
 * Update subscription plan
 */
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_packages');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { plan_id } = req.params;
    const {
      name,
      display_name,
      description,
      price,
      features,
      limits,
      is_popular,
      is_active,
      sort_order
    } = req.body;

    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Update Stripe product if display_name or description changed
    if (display_name !== plan.display_name || description !== plan.description) {
      await stripeService.stripe.products.update(plan.stripe_product_id, {
        name: display_name || plan.display_name,
        description: description || plan.description
      });
    }

    // Update plan in database
    await plan.update({
      name: name || plan.name,
      display_name: display_name || plan.display_name,
      description: description || plan.description,
      price: price ? parseFloat(price) : plan.price,
      features: features || plan.features,
      limits: limits || plan.limits,
      is_popular: is_popular !== undefined ? is_popular : plan.is_popular,
      is_active: is_active !== undefined ? is_active : plan.is_active,
      sort_order: sort_order !== undefined ? parseInt(sort_order) : plan.sort_order
    });

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      plan
    });

  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription plan'
    });
  }
};

/**
 * Delete subscription plan
 */
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_packages');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { plan_id } = req.params;

    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Check if plan has active subscriptions
    const { Subscription } = await import('./index.js');
    const activeSubscriptions = await Subscription.count({
      where: {
        subscription_plan_id: plan_id,
        status: {
          [Op.in]: ['active', 'trialing', 'past_due']
        }
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete plan with ${activeSubscriptions} active subscriptions. Deactivate the plan instead.`
      });
    }

    // Archive Stripe product and prices instead of deleting
    await stripeService.stripe.products.update(plan.stripe_product_id, {
      active: false
    });

    if (plan.stripe_price_id) {
      await stripeService.stripe.prices.update(plan.stripe_price_id, {
        active: false
      });
    }

    // Soft delete by deactivating
    await plan.update({ is_active: false });

    res.json({
      success: true,
      message: 'Subscription plan deactivated successfully'
    });

  } catch (error) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription plan'
    });
  }
};

/**
 * Get admin users
 */
export const getAdminUsers = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const admins = await Admin.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'created_at']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin users'
    });
  }
};

/**
 * Create admin user
 */
export const createAdminUser = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { user_id, admin_level, permissions, notes } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is already an admin
    const existingAdmin = await Admin.findOne({ where: { user_id } });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'User is already an admin'
      });
    }

    const admin = await Admin.create({
      user_id,
      admin_level: admin_level || 'admin',
      permissions: permissions || {
        manage_users: true,
        manage_subscriptions: true,
        manage_packages: true,
        view_analytics: true,
        manage_system: false
      },
      created_by: req.user.id,
      notes: notes || null
    });

    const adminWithUser = await Admin.findByPk(admin.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: adminWithUser
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user'
    });
  }
};

/**
 * Update admin user
 */
export const updateAdminUser = async (req, res) => {
  try {
    const hasPermission = await checkAdminPermission(req.user.id, 'manage_users');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { admin_id } = req.params;
    const { admin_level, permissions, status, notes } = req.body;

    const admin = await Admin.findByPk(admin_id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    await admin.update({
      admin_level: admin_level || admin.admin_level,
      permissions: permissions || admin.permissions,
      status: status || admin.status,
      notes: notes !== undefined ? notes : admin.notes
    });

    const updatedAdmin = await Admin.findByPk(admin_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Admin user updated successfully',
      admin: updatedAdmin
    });

  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update admin user'
    });
  }
};
