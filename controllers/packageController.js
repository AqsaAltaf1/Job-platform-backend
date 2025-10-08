import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { Op } from 'sequelize';
import Stripe from 'stripe';

// Initialize Stripe lazily to ensure environment variables are loaded
let stripe;
const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

// Helper function to sync plan to Stripe
const syncPlanToStripe = async (plan) => {
  try {
    // Check if Stripe product exists
    let stripeProduct;
    try {
      stripeProduct = await getStripe().products.retrieve(plan.stripe_product_id);
    } catch (error) {
      // Product doesn't exist, create it
      stripeProduct = await getStripe().products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          features: JSON.stringify(plan.features),
          max_job_postings: plan.limits.max_job_postings,
          max_applications: plan.limits.max_applications,
          max_team_members: plan.limits.max_team_members
        }
      });
      
      // Update plan with new Stripe product ID
      await plan.update({ stripe_product_id: stripeProduct.id });
    }

    // Check if Stripe price exists
    let stripePrice;
    try {
      stripePrice = await getStripe().prices.retrieve(plan.stripe_price_id);
    } catch (error) {
      // Price doesn't exist, create it
      // Create price object - handle both recurring and one-time payments
      const priceData = {
        product: stripeProduct.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: 'usd'
      };
      
      // Add recurring configuration only if it's a recurring plan
      if (plan.billing_cycle && plan.billing_cycle !== 'one_time') {
        priceData.recurring = {
          interval: plan.billing_cycle === 'monthly' ? 'month' : 'year'
        };
      }
      
      stripePrice = await getStripe().prices.create(priceData);
      
      // Update plan with new Stripe price ID
      await plan.update({ stripe_price_id: stripePrice.id });
    }

    // Update Stripe product
    await getStripe().products.update(stripeProduct.id, {
      name: plan.name,
      description: plan.description,
      active: plan.is_active,
      metadata: {
        features: JSON.stringify(plan.features),
        max_job_postings: plan.limits.max_job_postings,
        max_applications: plan.limits.max_applications,
        max_team_members: plan.limits.max_team_members
      }
    });

    return { stripeProduct, stripePrice };
  } catch (error) {
    console.error('Error syncing plan to Stripe:', error);
    throw error;
  }
};

/**
 * Get all subscription plans for admin
 */
export const getAdminSubscriptionPlans = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (status === 'active') {
      whereClause.is_active = true;
    } else if (status === 'inactive') {
      whereClause.is_active = false;
    }

    const { count, rows: plans } = await SubscriptionPlan.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      plans,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
};

/**
 * Get subscription plan by ID
 */
export const getSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get subscription plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plan'
    });
  }
};

/**
 * Create new subscription plan
 */
export const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      name,
      display_name,
      description,
      billing_cycle,
      price,
      features,
      max_job_postings,
      max_applications,
      max_team_members,
      stripe_price_id,
      stripe_product_id,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!name || !display_name || !description || !billing_cycle || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name, display name, description, billing cycle, and price are required'
      });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly', 'one_time'].includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        error: 'Billing cycle must be monthly, yearly, or one_time'
      });
    }

    // Check if plan with same name exists
    const existingPlan = await SubscriptionPlan.findOne({
      where: { name: { [Op.iLike]: name } }
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        error: 'A plan with this name already exists'
      });
    }

    // Create the plan
    const plan = await SubscriptionPlan.create({
      name,
      display_name,
      description,
      billing_cycle,
      price: parseFloat(price),
      features: Array.isArray(features) ? features.filter(f => f.trim()) : [],
      limits: {
        max_job_postings: parseInt(max_job_postings) || 0,
        max_applications: parseInt(max_applications) || 0,
        max_team_members: parseInt(max_team_members) || 0
      },
      stripe_price_id: stripe_price_id || null, // Will be created automatically if not provided
      stripe_product_id: stripe_product_id || null, // Will be created automatically if not provided
      is_active: Boolean(is_active)
    });

    // Sync to Stripe if not already synced
    try {
      await syncPlanToStripe(plan);
    } catch (stripeError) {
      console.error('Error syncing to Stripe:', stripeError);
      // Don't fail the request if Stripe sync fails
    }

    res.status(201).json({
      success: true,
      plan,
      message: 'Subscription plan created successfully'
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
    const { id } = req.params;
    const {
      name,
      description,
      price_monthly,
      price_yearly,
      features,
      max_job_postings,
      max_applications,
      max_team_members,
      is_active
    } = req.body;

    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== plan.name) {
      const existingPlan = await SubscriptionPlan.findOne({
        where: { 
          name: { [Op.iLike]: name },
          id: { [Op.ne]: id }
        }
      });

      if (existingPlan) {
        return res.status(400).json({
          success: false,
          error: 'A plan with this name already exists'
        });
      }
    }

    // Update the plan
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price_monthly !== undefined) updateData.price_monthly = parseFloat(price_monthly);
    if (price_yearly !== undefined) updateData.price_yearly = parseFloat(price_yearly);
    if (features !== undefined) updateData.features = Array.isArray(features) ? features.filter(f => f.trim()) : [];
    if (max_job_postings !== undefined) updateData.max_job_postings = parseInt(max_job_postings);
    if (max_applications !== undefined) updateData.max_applications = parseInt(max_applications);
    if (max_team_members !== undefined) updateData.max_team_members = parseInt(max_team_members);
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    await plan.update(updateData);

    // Sync to Stripe
    try {
      await syncPlanToStripe(plan);
    } catch (stripeError) {
      console.error('Error syncing to Stripe:', stripeError);
      // Don't fail the request if Stripe sync fails
    }

    res.json({
      success: true,
      plan,
      message: 'Subscription plan updated successfully'
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
    const { id } = req.params;

    const plan = await SubscriptionPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Check if plan is being used by any active subscriptions
    const { Subscription } = await import('../models/index.js');
    const activeSubscriptions = await Subscription.count({
      where: { 
        subscription_plan_id: id,
        status: ['active', 'trialing', 'past_due']
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete plan. It has ${activeSubscriptions} active subscription(s).`
      });
    }

    // Delete from Stripe first
    try {
      if (plan.stripe_product_id) {
        await getStripe().products.del(plan.stripe_product_id);
      }
    } catch (stripeError) {
      console.error('Error deleting from Stripe:', stripeError);
      // Continue with local deletion even if Stripe deletion fails
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
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
 * Get subscription plan statistics
 */
export const getSubscriptionPlanStats = async (req, res) => {
  try {
    const { Subscription } = await import('../models/index.js');
    
    // Get plan usage statistics
    const planStats = await SubscriptionPlan.findAll({
      attributes: [
        'id',
        'name',
        'is_active',
        [SubscriptionPlan.sequelize.fn('COUNT', SubscriptionPlan.sequelize.col('Subscriptions.id')), 'subscription_count']
      ],
      include: [{
        model: Subscription,
        as: 'subscriptions',
        attributes: [],
        required: false
      }],
      group: ['SubscriptionPlan.id', 'SubscriptionPlan.name', 'SubscriptionPlan.is_active']
    });

    // Get total statistics
    const totalStats = await SubscriptionPlan.findAll({
      attributes: [
        [SubscriptionPlan.sequelize.fn('COUNT', SubscriptionPlan.sequelize.col('id')), 'total_plans'],
        [SubscriptionPlan.sequelize.fn('COUNT', SubscriptionPlan.sequelize.literal('CASE WHEN is_active = true THEN 1 END')), 'active_plans'],
        [SubscriptionPlan.sequelize.fn('COUNT', SubscriptionPlan.sequelize.literal('CASE WHEN is_active = false THEN 1 END')), 'inactive_plans'],
        [SubscriptionPlan.sequelize.fn('AVG', SubscriptionPlan.sequelize.col('price_monthly')), 'avg_monthly_price'],
        [SubscriptionPlan.sequelize.fn('AVG', SubscriptionPlan.sequelize.col('price_yearly')), 'avg_yearly_price']
      ]
    });

    res.json({
      success: true,
      stats: {
        plans: planStats,
        totals: totalStats[0] || {
          total_plans: 0,
          active_plans: 0,
          inactive_plans: 0,
          avg_monthly_price: 0,
          avg_yearly_price: 0
        }
      }
    });

  } catch (error) {
    console.error('Get subscription plan stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plan statistics'
    });
  }
};

/**
 * Get active subscription plans for public pricing page
 */
export const getPublicSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: {
        is_active: true
      },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
      attributes: [
        'id',
        'name',
        'display_name',
        'description',
        'billing_cycle',
        'price',
        'features',
        'limits',
        'is_popular',
        'sort_order'
      ]
    });

    // Transform plans for frontend consumption
    const transformedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      display_name: plan.display_name,
      description: plan.description,
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      features: plan.features || [],
      limits: plan.limits || {},
      is_popular: plan.is_popular,
      sort_order: plan.sort_order
    }));

    res.json({
      success: true,
      plans: transformedPlans
    });

  } catch (error) {
    console.error('Get public subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
};
