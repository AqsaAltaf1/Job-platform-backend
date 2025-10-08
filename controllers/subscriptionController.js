import stripeServiceModule from '../services/stripeService.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import User from '../models/User.js';
import { EmployerProfile } from '../models/EmployerProfile.js';
import { Op } from 'sequelize';

/**
 * Get all subscription plans
 */
export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['price', 'ASC']]
    });

    res.json({
      success: true,
      plans
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
 * Create checkout session for new subscription
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { plan_id, billing_cycle = 'monthly' } = req.body;
    const user = req.user;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      where: {
        user_id: user.id,
        status: {
          [Op.in]: ['active', 'trialing', 'past_due']
        }
      }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription'
      });
    }

    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/subscription/plans`;

    const session = await stripeServiceModule.getInstance().createCheckoutSession(
      user,
      plan_id,
      billing_cycle,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      session_id: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
};

/**
 * Create checkout session for subscription change
 */
export const createSubscriptionChangeSession = async (req, res) => {
  try {
    const { subscription_id, new_plan_id, billing_cycle = 'monthly' } = req.body;
    const user = req.user;

    if (!subscription_id || !new_plan_id) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID and new plan ID are required'
      });
    }

    // Verify user owns the subscription
    const subscription = await Subscription.findOne({
      where: {
        id: subscription_id,
        user_id: user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const successUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/subscription/manage`;

    const session = await stripeServiceModule.getInstance().createSubscriptionChangeSession(
      subscription_id,
      new_plan_id,
      billing_cycle,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      session_id: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Create subscription change session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription change session'
    });
  }
};

/**
 * Get user's current subscription
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const user = req.user;

    const subscription = await Subscription.findOne({
      where: {
        user_id: user.id,
        status: {
          [Op.in]: ['active', 'trialing', 'past_due', 'canceled']
        }
      },
      include: [
        {
          model: SubscriptionPlan,
          as: 'subscriptionPlan'
        },
        {
          model: EmployerProfile,
          as: 'employerProfile'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null
      });
    }

    // Get usage data
    const usage = await stripeServiceModule.getInstance().getSubscriptionUsage(subscription.id);

    res.json({
      success: true,
      subscription: {
        ...subscription.toJSON(),
        usage
      }
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription'
    });
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const { cancel_at_period_end = true } = req.body;
    const user = req.user;

    // Verify user owns the subscription
    const subscription = await Subscription.findOne({
      where: {
        id: subscription_id,
        user_id: user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    await stripeServiceModule.getInstance().cancelSubscription(subscription_id, cancel_at_period_end);

    res.json({
      success: true,
      message: cancel_at_period_end 
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled immediately'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
};

/**
 * Resume subscription
 */
export const resumeSubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;
    const user = req.user;

    // Verify user owns the subscription
    const subscription = await Subscription.findOne({
      where: {
        id: subscription_id,
        user_id: user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    await stripeServiceModule.getInstance().resumeSubscription(subscription_id);

    res.json({
      success: true,
      message: 'Subscription resumed successfully'
    });

  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume subscription'
    });
  }
};

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    // Try to access subscription history, but handle permission errors gracefully
    let history = [];
    let count = 0;
    
    try {
      const result = await SubscriptionHistory.findAndCountAll({
        where: { user_id: user.id },
        include: [
          {
            model: SubscriptionPlan,
            as: 'oldPlan',
            attributes: ['id', 'name', 'display_name']
          },
          {
            model: SubscriptionPlan,
            as: 'newPlan',
            attributes: ['id', 'name', 'display_name']
          },
          {
            model: Subscription,
            as: 'subscription',
            attributes: ['id', 'stripe_subscription_id']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      history = result.rows;
      count = result.count;
    } catch (historyError) {
      console.log('Subscription history not accessible, returning empty array:', historyError.message);
      // Continue with empty history array
    }

    res.json({
      success: true,
      history,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history'
    });
  }
};

/**
 * Handle Stripe webhook
 */
export const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log('🔍 Webhook Debug Info:');
    console.log('- Signature header:', sig ? 'Present' : 'Missing');
    console.log('- Webhook secret:', endpointSecret ? 'Configured' : 'Missing');
    console.log('- Body type:', typeof req.body);
    console.log('- Body length:', req.body ? req.body.length : 'No body');

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).send('Webhook Error: No webhook secret configured');
    }

    if (!sig) {
      console.error('Stripe signature header missing');
      return res.status(400).send('Webhook Error: No signature header');
    }

    let event;
    try {
      // Use raw body for signature verification
      // req.body is already the raw buffer due to express.raw() middleware
      event = stripeServiceModule.getInstance().stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received webhook: ${event.type}`);
    
    // Handle the event
    await stripeServiceModule.getInstance().handleWebhook(event);

    // Return success response
    res.json({ 
      received: true,
      event_type: event.type,
      event_id: event.id
    });

  } catch (error) {
    console.error('Handle Stripe webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle webhook'
    });
  }
};

/**
 * Create subscription with payment method (for direct payment forms)
 */
export const createSubscription = async (req, res) => {
  try {
    const { plan_id, billing_cycle, payment_method_id, customer_info } = req.body;
    const userId = req.user.id;

    if (!plan_id || !billing_cycle || !payment_method_id) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID, billing cycle, and payment method are required'
      });
    }

    // Get the subscription plan
    const plan = await SubscriptionPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    // Get user and employer profile
    const user = await User.findByPk(userId, {
      include: [{ model: EmployerProfile, as: 'employerProfile' }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      where: { 
        user_id: userId,
        status: ['active', 'trialing', 'past_due']
      }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription'
      });
    }

    // Create or get Stripe customer
    let stripeCustomer;
    try {
      stripeCustomer = await stripeServiceModule.getInstance().createCustomer({
        email: customer_info?.email || user.email,
        name: customer_info?.name || `${user.first_name} ${user.last_name}`,
        metadata: {
          user_id: userId,
          employer_profile_id: user.employerProfile?.id || ''
        }
      });
    } catch (error) {
      console.error('Create customer error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create customer'
      });
    }

    // Attach payment method to customer
    try {
      await stripeServiceModule.getInstance().stripe.paymentMethods.attach(payment_method_id, {
        customer: stripeCustomer.id
      });

      // Set as default payment method
      await stripeServiceModule.getInstance().stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });
    } catch (error) {
      console.error('Attach payment method error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to attach payment method'
      });
    }

    // Create subscription
    const priceId = plan.stripe_price_id;
    
    try {
      const stripeSubscription = await stripeServiceModule.getInstance().stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{ price: priceId }],
        default_payment_method: payment_method_id,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId,
          plan_id: plan_id,
          billing_cycle: billing_cycle
        }
      });

      // Create subscription record in database
      const subscription = await Subscription.create({
        user_id: userId,
        employer_profile_id: user.employerProfile?.id || null,
        subscription_plan_id: plan_id,
        stripe_customer_id: stripeCustomer.id,
        stripe_subscription_id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
        current_period_end: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
      });

      // Log subscription history
      await stripeServiceModule.getInstance().logSubscriptionHistory(subscription.id, userId, 'created', {
        plan_name: plan.name,
        billing_cycle: billing_cycle,
        amount: plan.price,
        stripe_subscription_id: stripeSubscription.id,
        description: 'Subscription created with direct payment'
      });

      // Check if payment requires authentication
      const invoice = stripeSubscription.latest_invoice;
      let clientSecret = null;

      if (invoice && invoice.payment_intent) {
        const paymentIntent = invoice.payment_intent;
        if (paymentIntent.status === 'requires_action') {
          clientSecret = paymentIntent.client_secret;
        }
      }

      res.json({
        success: true,
        subscription,
        client_secret: clientSecret,
        message: 'Subscription created successfully'
      });

    } catch (error) {
      console.error('Create subscription error:', error);
      
      // Clean up customer if subscription creation failed
      try {
        await stripeServiceModule.getInstance().stripe.customers.del(stripeCustomer.id);
      } catch (cleanupError) {
        console.error('Cleanup customer error:', cleanupError);
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create subscription'
      });
    }

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
};
export const handleCheckoutSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const session = await stripeServiceModule.getInstance().stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      await stripeServiceModule.getInstance().handleCheckoutSuccess(session);
    }

    res.json({
      success: true,
      message: 'Checkout processed successfully'
    });

  } catch (error) {
    console.error('Handle checkout success error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process checkout success'
    });
  }
};

/**
 * Get subscription analytics (Admin only)
 */
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const [
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      monthlyRevenue,
      yearlyRevenue,
      planDistribution
    ] = await Promise.all([
      Subscription.count(),
      Subscription.count({ where: { status: 'active' } }),
      Subscription.count({ where: { status: 'canceled' } }),
      Subscription.count({ where: { billing_cycle: 'monthly', status: 'active' } }),
      Subscription.count({ where: { billing_cycle: 'yearly', status: 'active' } }),
      Subscription.findAll({
        attributes: [
          [Subscription.sequelize.col('subscriptionPlan.display_name'), 'plan_name'],
          [Subscription.sequelize.fn('COUNT', Subscription.sequelize.col('Subscription.id')), 'count']
        ],
        include: [{
          model: SubscriptionPlan,
          as: 'subscriptionPlan',
          attributes: []
        }],
        where: { status: 'active' },
        group: ['subscriptionPlan.id', 'subscriptionPlan.display_name'],
        raw: true
      })
    ]);

    // Get recent subscription activity
    const recentActivity = await SubscriptionHistory.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['first_name', 'last_name', 'email']
        },
        {
          model: SubscriptionPlan,
          as: 'newPlan',
          attributes: ['display_name']
        }
      ]
    });

    res.json({
      success: true,
      analytics: {
        overview: {
          totalSubscriptions,
          activeSubscriptions,
          canceledSubscriptions,
          churnRate: totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions * 100).toFixed(2) : 0
        },
        billing: {
          monthlySubscriptions: monthlyRevenue,
          yearlySubscriptions: yearlyRevenue
        },
        planDistribution,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Get subscription analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription analytics'
    });
  }
};
