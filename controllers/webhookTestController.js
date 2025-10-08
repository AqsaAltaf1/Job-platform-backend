import Stripe from 'stripe';

// Initialize Stripe lazily to ensure environment variables are loaded
let stripe;
const getStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

// Test webhook endpoint to verify it's working
export const testWebhook = async (req, res) => {
  try {
    console.log('🧪 Webhook test endpoint called');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    res.json({
      success: true,
      message: 'Webhook test endpoint is working!',
      timestamp: new Date().toISOString(),
      headers: req.headers,
      body: req.body
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook test failed'
    });
  }
};

// Get webhook logs (for testing)
export const getWebhookLogs = async (req, res) => {
  try {
    // This would typically come from your database
    // For now, we'll return a mock response
    res.json({
      success: true,
      logs: [
        {
          id: 'evt_test_123',
          type: 'product.created',
          created: new Date().toISOString(),
          data: {
            object: {
              id: 'prod_test_123',
              name: 'Test Product'
            }
          }
        }
      ]
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook logs'
    });
  }
};