import Stripe from 'stripe';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import SubscriptionHistory from '../models/SubscriptionHistory.js';
import User from '../models/User.js';
import { EmployerProfile } from '../models/EmployerProfile.js';

class StripeService {
  constructor() {
    this.stripe = null;
    // Initialize Stripe instance immediately if secret key is available
    if (process.env.STRIPE_SECRET_KEY) {
      this.getStripe();
    }
  }

  getStripe() {
    if (!this.stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not set');
      }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    }
    return this.stripe;
  }

  /**
   * Create or get Stripe customer
   */
  async createOrGetCustomer(user, employerProfile = null) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.stripe_customer_id) {
        return await this.stripe.customers.retrieve(user.stripe_customer_id);
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
          user_id: user.id,
          employer_profile_id: employerProfile?.id || null,
          company_name: employerProfile?.company_name || null
        }
      });

      // Update user with Stripe customer ID
      await User.update(
        { stripe_customer_id: customer.id },
        { where: { id: user.id } }
      );

      return customer;
    } catch (error) {
      console.error('Create Stripe customer error:', error);
      throw error;
    }
  }

  /**
   * Create subscription checkout session
   */
  async createCheckoutSession(user, planId, billingCycle, successUrl, cancelUrl) {
    try {
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const customer = await this.createOrGetCustomer(user);
      const priceId = plan.stripe_price_id;

      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_id: planId,
            billing_cycle: billingCycle
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  }

  /**
   * Create subscription change session (upgrade/downgrade)
   */
  async createSubscriptionChangeSession(subscriptionId, newPlanId, billingCycle, successUrl, cancelUrl) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [
          { model: User, as: 'user' },
          { model: SubscriptionPlan, as: 'subscriptionPlan' }
        ]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Handle free plan case
      if (newPlanId === 'free') {
        // For free plan, we need to cancel the current subscription instead of creating a new one
        // This should be handled differently - we'll cancel the subscription
        throw new Error('Free plan downgrade should be handled via subscription cancellation');
      }

      const newPlan = await SubscriptionPlan.findByPk(newPlanId);
      if (!newPlan) {
        throw new Error('New subscription plan not found');
      }

      const newPriceId = newPlan.stripe_price_id;

      // Create checkout session for subscription change
      const session = await this.stripe.checkout.sessions.create({
        customer: subscription.stripe_customer_id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: newPriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: subscription.user_id,
          old_subscription_id: subscriptionId,
          new_plan_id: newPlanId,
          billing_cycle: billingCycle,
          action: 'change_plan'
        },
        subscription_data: {
          metadata: {
            user_id: subscription.user_id,
            old_subscription_id: subscriptionId,
            new_plan_id: newPlanId,
            billing_cycle: billingCycle,
            action: 'change_plan'
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Create subscription change session error:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Cancel in Stripe
      const stripeSubscription = await this.getStripe().subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
          metadata: {
            canceled_by: 'user',
            cancel_at_period_end: cancelAtPeriodEnd.toString()
          }
        }
      );

      // Update local subscription
      await subscription.update({
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: cancelAtPeriodEnd ? null : new Date(),
        status: cancelAtPeriodEnd ? subscription.status : 'canceled'
      });

      // Log in history
      await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'canceled', {
        old_status: subscription.status,
        new_status: cancelAtPeriodEnd ? subscription.status : 'canceled',
        description: cancelAtPeriodEnd ? 'Subscription will cancel at period end' : 'Subscription canceled immediately'
      });

      return stripeSubscription;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Resume in Stripe
      const stripeSubscription = await this.getStripe().subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: false,
          metadata: {
            resumed_by: 'user'
          }
        }
      );

      // Update local subscription
      await subscription.update({
        cancel_at_period_end: false,
        canceled_at: null
      });

      // Log in history
      await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'resumed', {
        old_status: subscription.status,
        new_status: 'active',
        description: 'Subscription resumed'
      });

      return stripeSubscription;
    } catch (error) {
      console.error('Resume subscription error:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout
   */
  async handleCheckoutSuccess(session) {
    try {
      const { user_id, plan_id, billing_cycle, action, old_subscription_id } = session.metadata;

      // If plan_id is missing from metadata, try to get it from the subscription
      let resolvedPlanId = plan_id;
      if (!resolvedPlanId && session.subscription) {
        try {
          const stripeSubscription = await this.getStripe().subscriptions.retrieve(session.subscription);
          if (stripeSubscription.items && stripeSubscription.items.data.length > 0) {
            const priceId = stripeSubscription.items.data[0].price.id;
            // Find the plan by stripe_price_id
            const plan = await SubscriptionPlan.findOne({
              where: { stripe_price_id: priceId }
            });
            if (plan) {
              resolvedPlanId = plan.id;
              console.log(`Resolved plan ID from price: ${resolvedPlanId}`);
            }
          }
        } catch (subscriptionError) {
          console.error('Error retrieving subscription for plan resolution:', subscriptionError);
        }
      }

      if (action === 'change_plan') {
        // Handle subscription change
        await this.handleSubscriptionChange(old_subscription_id, resolvedPlanId, billing_cycle, session);
      } else {
        // Handle new subscription
        await this.createNewSubscription(user_id, resolvedPlanId, billing_cycle, session);
      }
    } catch (error) {
      console.error('Handle checkout success error:', error);
      throw error;
    }
  }

  /**
   * Create new subscription record
   */
  async createNewSubscription(userId, planId, billingCycle, session) {
    try {
      // Validate required parameters
      if (!planId) {
        throw new Error('Plan ID is required to create subscription');
      }

      let stripeSubscription;
      try {
        stripeSubscription = await this.getStripe().subscriptions.retrieve(session.subscription);
      } catch (stripeError) {
        if (stripeError.code === 'resource_missing') {
          console.log(`Subscription ${session.subscription} no longer exists in Stripe, skipping creation`);
          return null;
        }
        throw stripeError;
      }
      
      // Check if subscription already exists
      const existingSubscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });
      
      if (existingSubscription) {
        console.log(`Subscription already exists: ${stripeSubscription.id}`);
        return existingSubscription;
      }
      
      const subscription = await Subscription.create({
        user_id: userId,
        subscription_plan_id: planId,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeSubscription.customer,
        status: stripeSubscription.status,
        billing_cycle: billingCycle,
        current_period_start: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
        current_period_end: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
        trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        metadata: {
          stripe_session_id: session.id,
          created_via: 'checkout'
        }
      });

      // Log in history
      await this.logSubscriptionHistory(subscription.id, userId, 'created', {
        new_plan_id: planId,
        new_status: stripeSubscription.status,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        billing_cycle: billingCycle,
        description: 'New subscription created'
      });

      return subscription;
    } catch (error) {
      console.error('Create new subscription error:', error);
      throw error;
    }
  }

  /**
   * Handle subscription change (upgrade/downgrade)
   */
  async handleSubscriptionChange(oldSubscriptionId, newPlanId, billingCycle, session) {
    try {
      const oldSubscription = await Subscription.findByPk(oldSubscriptionId, {
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }]
      });

      if (!oldSubscription) {
        console.log(`Old subscription ${oldSubscriptionId} not found, skipping change`);
        return null;
      }

      // Cancel old subscription
      try {
        await this.getStripe().subscriptions.cancel(oldSubscription.stripe_subscription_id);
      } catch (cancelError) {
        if (cancelError.code === 'resource_missing') {
          console.log(`Old subscription ${oldSubscription.stripe_subscription_id} already deleted in Stripe`);
        } else {
          throw cancelError;
        }
      }
      await oldSubscription.update({ status: 'canceled', canceled_at: new Date() });

      // Create new subscription
      const newSubscription = await this.createNewSubscription(
        oldSubscription.user_id,
        newPlanId,
        billingCycle,
        session
      );

      if (!newSubscription) {
        console.log('New subscription creation failed, skipping history log');
        return null;
      }

      // Log change in history
      await this.logSubscriptionHistory(newSubscription.id, oldSubscription.user_id, 
        this.isUpgrade(oldSubscription.subscriptionPlan, newPlanId) ? 'upgraded' : 'downgraded',
        {
          old_plan_id: oldSubscription.subscription_plan_id,
          new_plan_id: newPlanId,
          old_status: 'canceled',
          new_status: newSubscription.status,
          amount: session.amount_total / 100,
          currency: session.currency.toUpperCase(),
          billing_cycle: billingCycle,
          description: 'Subscription plan changed'
        }
      );

      return newSubscription;
    } catch (error) {
      console.error('Handle subscription change error:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event) {
    try {
      console.log(`Processing webhook event: ${event.type} (${event.id})`);
      
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object);
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'plan.deleted':
          await this.handlePlanDeleted(event.data.object);
          break;
        case 'product.deleted':
          await this.handleProductDeleted(event.data.object);
          break;
        case 'plan.created':
          await this.handlePlanCreated(event.data.object);
          break;
        case 'product.created':
          await this.handleProductCreated(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      console.log(`Successfully processed webhook event: ${event.type}`);
      
    } catch (error) {
      console.error('Handle webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle subscription created webhook
   */
  async handleSubscriptionCreated(stripeSubscription) {
    try {
      console.log('Handling subscription created:', stripeSubscription.id);
      
      // Find if we already have this subscription
      const existingSubscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });

      if (!existingSubscription) {
        console.log('Subscription not found in database, may have been created via webhook');
        // This subscription was created outside our normal flow
        // We would need additional metadata to properly create it
      } else {
        // Update the existing subscription with latest data
        await existingSubscription.update({
          status: stripeSubscription.status,
          current_period_start: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : null,
          current_period_end: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
          trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
          trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
        });

        await this.logSubscriptionHistory(existingSubscription.id, existingSubscription.user_id, 'activated', {
          new_status: stripeSubscription.status,
          stripe_event_id: stripeSubscription.id,
          description: 'Subscription activated via Stripe webhook'
        });
      }
    } catch (error) {
      console.error('Handle subscription created error:', error);
    }
  }

  /**
   * Handle subscription deleted webhook
   */
  async handleSubscriptionDeleted(stripeSubscription) {
    try {
      console.log('Handling subscription deleted:', stripeSubscription.id);
      
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });

      if (subscription) {
        await subscription.update({
          status: 'canceled',
          canceled_at: new Date(),
          cancel_at_period_end: false
        });

        await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'canceled', {
          old_status: subscription.status,
          new_status: 'canceled',
          stripe_event_id: stripeSubscription.id,
          description: 'Subscription canceled via Stripe webhook'
        });
      }
    } catch (error) {
      console.error('Handle subscription deleted error:', error);
    }
  }

  /**
   * Handle trial will end webhook
   */
  async handleTrialWillEnd(stripeSubscription) {
    try {
      console.log('Handling trial will end:', stripeSubscription.id);
      
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id },
        include: [{ model: User, as: 'user' }]
      });

      if (subscription && subscription.user) {
        await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'trial_ended', {
          stripe_event_id: stripeSubscription.id,
          description: 'Trial period ending soon'
        });

        // Here you could send an email notification to the user
        console.log(`Trial ending soon for user: ${subscription.user.email}`);
      }
    } catch (error) {
      console.error('Handle trial will end error:', error);
    }
  }

  /**
   * Handle payment succeeded webhook
   */
  async handlePaymentSucceeded(invoice) {
    try {
      console.log('Handling payment succeeded:', invoice.id);
      
      if (invoice.subscription) {
        const subscription = await Subscription.findOne({
          where: { stripe_subscription_id: invoice.subscription }
        });

        if (subscription) {
          await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'payment_succeeded', {
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            stripe_invoice_id: invoice.id,
            stripe_event_id: invoice.subscription,
            description: 'Payment processed successfully'
          });
        }
      }
    } catch (error) {
      console.error('Handle payment succeeded error:', error);
    }
  }

  /**
   * Handle payment failed webhook
   */
  async handlePaymentFailed(invoice) {
    try {
      console.log('Handling payment failed:', invoice.id);
      
      if (invoice.subscription) {
        const subscription = await Subscription.findOne({
          where: { stripe_subscription_id: invoice.subscription },
          include: [{ model: User, as: 'user' }]
        });

        if (subscription) {
          await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'payment_failed', {
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            stripe_invoice_id: invoice.id,
            stripe_event_id: invoice.subscription,
            description: 'Payment failed - subscription may be suspended'
          });

          // Update subscription status if it's now past due
          if (subscription.status !== 'past_due') {
            await subscription.update({ status: 'past_due' });
          }

          // Here you could send an email notification to the user
          console.log(`Payment failed for user: ${subscription.user.email}`);
        }
      }
    } catch (error) {
      console.error('Handle payment failed error:', error);
    }
  }

  /**
   * Handle invoice created webhook
   */
  async handleInvoiceCreated(invoice) {
    try {
      console.log('Handling invoice created:', invoice.id);
      
      if (invoice.subscription) {
        const subscription = await Subscription.findOne({
          where: { stripe_subscription_id: invoice.subscription }
        });

        if (subscription) {
          await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'renewed', {
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            stripe_invoice_id: invoice.id,
            description: 'New billing cycle - invoice created'
          });
        }
      }
    } catch (error) {
      console.error('Handle invoice created error:', error);
    }
  }

  /**
   * Handle checkout session completed webhook
   */
  async handleCheckoutCompleted(session) {
    try {
      console.log('Handling checkout completed:', session.id);
      
      if (session.mode === 'subscription' && session.subscription) {
        await this.handleCheckoutSuccess(session);
      }
    } catch (error) {
      console.error('Handle checkout completed error:', error);
    }
  }
  async handleSubscriptionUpdated(stripeSubscription) {
    try {
      const subscription = await Subscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });

      if (subscription) {
        const oldStatus = subscription.status;
        // Safely convert timestamps to dates, handling null/undefined values
        const currentPeriodStart = stripeSubscription.current_period_start 
          ? new Date(stripeSubscription.current_period_start * 1000) 
          : null;
        const currentPeriodEnd = stripeSubscription.current_period_end 
          ? new Date(stripeSubscription.current_period_end * 1000) 
          : null;

        await subscription.update({
          status: stripeSubscription.status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end
        });

        if (oldStatus !== stripeSubscription.status) {
          await this.logSubscriptionHistory(subscription.id, subscription.user_id, 'activated', {
            old_status: oldStatus,
            new_status: stripeSubscription.status,
            stripe_event_id: stripeSubscription.id,
            description: 'Subscription status updated'
          });
        }
      }
    } catch (error) {
      console.error('Handle subscription updated error:', error);
    }
  }

  /**
   * Log subscription history
   */
  async logSubscriptionHistory(subscriptionId, userId, action, data = {}) {
    try {
      await SubscriptionHistory.create({
        subscription_id: subscriptionId,
        user_id: userId,
        action: action,
        old_plan_id: data.old_plan_id || null,
        new_plan_id: data.new_plan_id || null,
        old_status: data.old_status || null,
        new_status: data.new_status || null,
        amount: data.amount || null,
        currency: data.currency || 'USD',
        billing_cycle: data.billing_cycle || null,
        stripe_event_id: data.stripe_event_id || null,
        stripe_invoice_id: data.stripe_invoice_id || null,
        description: data.description || null,
        metadata: data.metadata || {}
      });
    } catch (error) {
      console.error('Log subscription history error:', error);
    }
  }

  /**
   * Check if plan change is an upgrade
   */
  isUpgrade(oldPlan, newPlanId) {
    // Simple logic - can be enhanced based on plan hierarchy
    const planHierarchy = {
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };

    return planHierarchy[newPlanId] > planHierarchy[oldPlan.name];
  }

  /**
   * Get subscription usage and limits
   */
  async getSubscriptionUsage(subscriptionId) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [{ model: SubscriptionPlan, as: 'subscriptionPlan' }]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // This would typically query usage from various tables
      // For now, returning mock data
      return {
        jobPostings: {
          used: 15,
          limit: subscription.subscriptionPlan.limits.job_postings || 50
        },
        teamMembers: {
          used: 3,
          limit: subscription.subscriptionPlan.limits.team_members || 10
        },
        applications: {
          used: 245,
          limit: subscription.subscriptionPlan.limits.applications || 1000
        }
      };
    } catch (error) {
      console.error('Get subscription usage error:', error);
      throw error;
    }
  }

  /**
   * Handle plan deleted webhook
   */
  async handlePlanDeleted(stripePlan) {
    try {
      console.log('Handling plan deleted:', stripePlan.id);
      
      // Find and delete the plan from our database
      const deletedPlan = await SubscriptionPlan.destroy({
        where: { stripe_price_id: stripePlan.id }
      });
      
      if (deletedPlan > 0) {
        console.log(`Deleted ${deletedPlan} plan(s) from database for Stripe plan: ${stripePlan.id}`);
      } else {
        console.log(`No plans found in database for Stripe plan: ${stripePlan.id}`);
      }
      
    } catch (error) {
      console.error('Error handling plan deleted:', error);
      throw error;
    }
  }

  /**
   * Handle product deleted webhook
   */
  async handleProductDeleted(stripeProduct) {
    try {
      console.log('Handling product deleted:', stripeProduct.id);
      
      // Find and delete all plans associated with this product
      const deletedPlans = await SubscriptionPlan.destroy({
        where: { stripe_product_id: stripeProduct.id }
      });
      
      if (deletedPlans > 0) {
        console.log(`Deleted ${deletedPlans} plan(s) from database for Stripe product: ${stripeProduct.id}`);
      } else {
        console.log(`No plans found in database for Stripe product: ${stripeProduct.id}`);
      }
      
    } catch (error) {
      console.error('Error handling product deleted:', error);
      throw error;
    }
  }

  /**
   * Handle plan created webhook
   */
  async handlePlanCreated(stripePlan) {
    try {
      console.log('Handling plan created:', stripePlan.id);
      
      // Check if plan already exists
      const existingPlan = await SubscriptionPlan.findOne({
        where: { stripe_price_id: stripePlan.id }
      });
      
      if (existingPlan) {
        console.log(`Plan already exists in database: ${stripePlan.id}`);
        return;
      }
      
      // Get product information to create better names
      let productName = 'Subscription Plan';
      let productDescription = '';
      
      try {
        const product = await this.stripe.products.retrieve(stripePlan.product);
        productName = product.name || 'Subscription Plan';
        productDescription = product.description || '';
      } catch (productError) {
        console.log('Could not fetch product details, using defaults');
      }
      
      // Create formatted names
      const billingCycle = stripePlan.interval === 'month' ? 'Monthly' : 
                          stripePlan.interval === 'year' ? 'Yearly' : 'One-time';
      const planName = `${productName} (${billingCycle})`;
      const displayName = `${productName} (${billingCycle})`;
      
      // Create new plan in database
      const newPlan = await SubscriptionPlan.create({
        stripe_price_id: stripePlan.id,
        stripe_product_id: stripePlan.product,
        name: planName,
        display_name: displayName,
        description: productDescription,
        price: stripePlan.amount / 100, // Convert from cents
        billing_cycle: stripePlan.interval === 'month' ? 'monthly' : 
                      stripePlan.interval === 'year' ? 'yearly' : 'one_time',
        is_active: stripePlan.active,
        features: stripePlan.metadata?.features || {},
        limits: stripePlan.metadata?.limits || {}
      });
      
      console.log(`Created new plan in database: ${newPlan.id} for Stripe plan: ${stripePlan.id}`);
      console.log(`Plan name: ${planName}, Price: $${newPlan.price}`);
      
    } catch (error) {
      console.error('Error handling plan created:', error);
      throw error;
    }
  }

  /**
   * Handle product created webhook
   */
  async handleProductCreated(stripeProduct) {
    try {
      console.log('Handling product created:', stripeProduct.id);
      
      // For now, we just log product creation
      // Plans will be created separately when they're created in Stripe
      console.log(`Product created: ${stripeProduct.name} (${stripeProduct.id})`);
      
    } catch (error) {
      console.error('Error handling product created:', error);
      throw error;
    }
  }
}

// Lazy singleton pattern to avoid initialization during module import

let stripeServiceInstance = null;

export default {
  getInstance() {
    if (!stripeServiceInstance) {
      stripeServiceInstance = new StripeService();
    }
    return stripeServiceInstance;
  }
};
