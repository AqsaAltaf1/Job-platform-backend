import Stripe from 'stripe';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

// Initialize Stripe lazily to ensure environment variables are loaded
let stripe;
const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

// Sync package from Stripe to website
export const syncFromStripe = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product from Stripe
    const product = await getStripe().products.retrieve(productId);
    
    // Get prices for this product
    const prices = await getStripe().prices.list({
      product: productId,
      active: true
    });

    if (prices.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active prices found for this product'
      });
    }

    // Process each price (monthly/yearly)
    for (const price of prices.data) {
      const billingCycle = price.recurring?.interval === 'month' ? 'monthly' : 'yearly';
      
      // Check if package already exists
      let existingPlan = await SubscriptionPlan.findOne({
        where: {
          stripe_product_id: productId,
          billing_cycle: billingCycle
        }
      });

      if (existingPlan) {
        // Update existing plan
        await existingPlan.update({
          name: product.name,
          display_name: product.name,
          description: product.description || '',
          price: price.unit_amount / 100, // Convert from cents
          stripe_price_id: price.id,
          is_active: product.active,
          features: product.metadata?.features ? JSON.parse(product.metadata.features) : []
        });
      } else {
        // Create new plan
        await SubscriptionPlan.create({
          name: product.name,
          display_name: product.name,
          description: product.description || '',
          billing_cycle: billingCycle,
          price: price.unit_amount / 100,
          stripe_price_id: price.id,
          stripe_product_id: productId,
          is_active: product.active,
          features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
          limits: {
            max_job_postings: parseInt(product.metadata?.max_job_postings) || 0,
            max_applications: parseInt(product.metadata?.max_applications) || 0,
            max_team_members: parseInt(product.metadata?.max_team_members) || 0
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'Package synced from Stripe successfully'
    });
  } catch (error) {
    console.error('Error syncing from Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync from Stripe'
    });
  }
};

// Sync package from website to Stripe
export const syncToStripe = async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }

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
      stripePrice = await getStripe().prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: 'usd',
        recurring: {
          interval: plan.billing_cycle === 'monthly' ? 'month' : 'year'
        }
      });
      
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

    res.json({
      success: true,
      message: 'Package synced to Stripe successfully',
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id
    });
  } catch (error) {
    console.error('Error syncing to Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync to Stripe'
    });
  }
};

// Handle Stripe webhooks
export const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'product.created':
      case 'product.updated':
        await handleProductUpdate(event.data.object);
        break;
      case 'product.deleted':
        await handleProductDelete(event.data.object);
        break;
      case 'price.created':
      case 'price.updated':
        await handlePriceUpdate(event.data.object);
        break;
      case 'price.deleted':
        await handlePriceDelete(event.data.object);
        break;
      case 'plan.created':
        await handlePlanCreate(event.data.object);
        break;
      case 'plan.deleted':
        await handlePlanDelete(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle webhook'
    });
  }
};

// Helper functions for webhook handling
const handleProductUpdate = async (product) => {
  try {
    // Find existing plans for this product
    const existingPlans = await SubscriptionPlan.findAll({
      where: { stripe_product_id: product.id }
    });

    if (existingPlans.length > 0) {
      // Update existing plans
      for (const plan of existingPlans) {
        await plan.update({
          name: product.name,
          display_name: product.name,
          description: product.description || '',
          is_active: product.active,
          features: product.metadata?.features ? JSON.parse(product.metadata.features) : []
        });
      }
    }
  } catch (error) {
    console.error('Error handling product update:', error);
  }
};

const handleProductDelete = async (product) => {
  try {
    // Mark plans as inactive instead of deleting
    await SubscriptionPlan.update(
      { is_active: false },
      { where: { stripe_product_id: product.id } }
    );
  } catch (error) {
    console.error('Error handling product delete:', error);
  }
};

const handlePriceUpdate = async (price) => {
  try {
    const plan = await SubscriptionPlan.findOne({
      where: { stripe_price_id: price.id }
    });

    if (plan) {
      await plan.update({
        price: price.unit_amount / 100,
        is_active: price.active
      });
    }
  } catch (error) {
    console.error('Error handling price update:', error);
  }
};

const handlePriceDelete = async (price) => {
  try {
    const plan = await SubscriptionPlan.findOne({
      where: { stripe_price_id: price.id }
    });

    if (plan) {
      await plan.update({ is_active: false });
    }
  } catch (error) {
    console.error('Error handling price delete:', error);
  }
};

// Get all Stripe products
export const getStripeProducts = async (req, res) => {
  try {
    const products = await getStripe().products.list({
      active: true,
      limit: 100
    });

    res.json({
      success: true,
      products: products.data
    });
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stripe products'
    });
  }
};

// Sync all packages from Stripe
export const syncAllFromStripe = async (req, res) => {
  try {
    const products = await getStripe().products.list({
      active: true,
      limit: 100
    });

    let syncedCount = 0;
    for (const product of products.data) {
      try {
        const prices = await getStripe().prices.list({
          product: product.id,
          active: true
        });

        for (const price of prices.data) {
          const billingCycle = price.recurring?.interval === 'month' ? 'monthly' : 'yearly';
          
          let existingPlan = await SubscriptionPlan.findOne({
            where: {
              stripe_product_id: product.id,
              billing_cycle: billingCycle
            }
          });

          if (existingPlan) {
            await existingPlan.update({
              name: product.name,
              display_name: product.name,
              description: product.description || '',
              price: price.unit_amount / 100,
              stripe_price_id: price.id,
              is_active: product.active,
              features: product.metadata?.features ? JSON.parse(product.metadata.features) : []
            });
          } else {
            await SubscriptionPlan.create({
              name: product.name,
              display_name: product.name,
              description: product.description || '',
              billing_cycle: billingCycle,
              price: price.unit_amount / 100,
              stripe_price_id: price.id,
              stripe_product_id: product.id,
              is_active: product.active,
              features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
              limits: {
                max_job_postings: parseInt(product.metadata?.max_job_postings) || 0,
                max_applications: parseInt(product.metadata?.max_applications) || 0,
                max_team_members: parseInt(product.metadata?.max_team_members) || 0
              }
            });
          }
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} packages from Stripe`
    });
  } catch (error) {
    console.error('Error syncing all from Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync from Stripe'
    });
  }
};

// Handle plan creation from webhook events
const handlePlanCreate = async (planData) => {
  try {
    console.log('➕ Handling plan creation:', planData);
    
    // Check if this is a price object (Stripe calls prices "plans" in some contexts)
    if (planData.object === 'plan' && planData.id.startsWith('price_')) {
      // This is actually a price creation, we need to get the product info
      const stripe = getStripe();
      const price = planData;
      const product = await stripe.products.retrieve(price.product);
      
      // Check if plan already exists with this price ID
      const existingPlan = await SubscriptionPlan.findOne({
        where: { stripe_price_id: price.id }
      });
      
      if (!existingPlan) {
        // Map Stripe interval to our billing cycle values
        const billingCycleMap = {
          'month': 'monthly',
          'year': 'yearly',
          'monthly': 'monthly',
          'yearly': 'yearly'
        };
        
        const billingCycle = billingCycleMap[price.interval] || 'monthly';
        
        // Create new plan in database
        const newPlan = await SubscriptionPlan.create({
          name: product.name,
          display_name: product.name, // Use product name as display name
          description: product.description || '',
          billing_cycle: billingCycle,
          price: parseFloat(price.amount) / 100, // Convert from cents to dollars
          stripe_price_id: price.id,
          stripe_product_id: product.id,
          is_active: product.active,
          features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
          limits: {
            max_job_postings: parseInt(product.metadata?.max_job_postings) || 0,
            max_applications: parseInt(product.metadata?.max_applications) || 0,
            max_team_members: parseInt(product.metadata?.max_team_members) || 0
          }
        });
        console.log(`✅ Created new plan in database: ${newPlan.name} (${price.id})`);
      } else {
        console.log(`⚠️ Plan already exists in database: ${price.id}`);
      }
    } else {
      // This is a product creation, but we need prices to create a complete plan
      console.log(`ℹ️ Product created, waiting for price creation to complete the plan: ${planData.id}`);
    }
  } catch (error) {
    console.error('❌ Error handling plan creation:', error);
  }
};

// Handle plan deletion from webhook events
const handlePlanDelete = async (planData) => {
  try {
    console.log('🗑️ Handling plan deletion:', planData);
    
    let plan = null;
    
    // Check if this is a price object (Stripe calls prices "plans" in some contexts)
    if (planData.object === 'plan' && planData.id.startsWith('price_')) {
      // This is actually a price deletion, find by stripe_price_id
      plan = await SubscriptionPlan.findOne({
        where: { stripe_price_id: planData.id }
      });
    } else {
      // This is a product deletion, find by stripe_product_id
      plan = await SubscriptionPlan.findOne({
        where: { stripe_product_id: planData.id }
      });
    }
    
    if (plan) {
      // Delete the plan from our database
      await plan.destroy();
      console.log(`✅ Deleted plan from database: ${plan.name} (${planData.id})`);
    } else {
      console.log(`⚠️ Plan not found in database: ${planData.id}`);
    }
  } catch (error) {
    console.error('❌ Error handling plan deletion:', error);
  }
};

// Handle payment failures
const handlePaymentFailed = async (invoice) => {
  try {
    console.log('💳 Handling payment failure:', invoice.id);
    
    // Get customer information
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(invoice.customer);
    
    // Get subscription information if it exists
    let subscription = null;
    if (invoice.subscription) {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    }
    
    // Send email notification to customer
    const emailData = {
      to: customer.email,
      subject: 'Payment Failed - Subscription Issue',
      template: 'payment-failed',
      data: {
        customerName: customer.name || 'Valued Customer',
        amount: (invoice.amount_due / 100).toFixed(2),
        currency: invoice.currency.toUpperCase(),
        subscriptionId: subscription?.id || 'N/A',
        planName: subscription?.items?.data[0]?.price?.nickname || 'Your Plan',
        failureReason: invoice.last_payment_error?.message || 'Payment could not be processed',
        retryDate: new Date(invoice.next_payment_attempt * 1000).toLocaleDateString(),
        supportEmail: 'support@yourcompany.com'
      }
    };
    
    // TODO: Implement email sending service
    console.log('📧 Email notification data:', emailData);
    console.log(`⚠️ Payment failed for customer ${customer.email}. Amount: $${emailData.data.amount}`);
    
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
};

// Handle subscription deletion
const handleSubscriptionDeleted = async (subscription) => {
  try {
    console.log('🗑️ Handling subscription deletion:', subscription.id);
    
    // Get customer information
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Update subscription status in your database
    // TODO: Update your subscription table
    console.log(`📊 Subscription ${subscription.id} deleted for customer ${customer.email}`);
    
  } catch (error) {
    console.error('❌ Error handling subscription deletion:', error);
  }
};

// Handle subscription updates
const handleSubscriptionUpdated = async (subscription) => {
  try {
    console.log('🔄 Handling subscription update:', subscription.id);
    
    // Get customer information
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Update subscription status in your database
    // TODO: Update your subscription table with new status
    console.log(`📊 Subscription ${subscription.id} updated for customer ${customer.email}. Status: ${subscription.status}`);
    
  } catch (error) {
    console.error('❌ Error handling subscription update:', error);
  }
};
