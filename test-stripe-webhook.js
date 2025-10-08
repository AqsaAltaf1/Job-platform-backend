import fetch from 'node-fetch';

async function testStripeWebhook() {
  const webhookUrl = 'https://job-platform-backend-jhq7.onrender.com/api/stripe/webhook';
  
  // Test payload (simulating a Stripe webhook)
  const testPayload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
      }
    }
  };

  try {
    console.log('🧪 Testing Stripe webhook endpoint...');
    console.log('📍 URL:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // This will fail verification, but we can see if endpoint is reachable
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);

    if (response.status === 200) {
      console.log('✅ Webhook endpoint is reachable!');
    } else {
      console.log('⚠️  Webhook endpoint responded with status:', response.status);
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testStripeWebhook();
