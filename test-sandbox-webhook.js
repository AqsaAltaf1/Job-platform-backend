import fetch from 'node-fetch';

async function testSandboxWebhook() {
  const webhookUrl = 'https://job-platform-backend-jhq7.onrender.com/api/stripe/webhook';
  
  // Test subscription created event
  const testEvent = {
    id: 'evt_test_webhook_123',
    object: 'event',
    type: 'customer.subscription.created',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_test_123456',
        customer: 'cus_test_123456',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        items: {
          data: [{
            price: {
              id: 'price_test_123',
              product: 'prod_test_123'
            }
          }]
        }
      }
    }
  };

  try {
    console.log('🧪 Testing Stripe Sandbox Webhook...');
    console.log('📍 URL:', webhookUrl);
    console.log('📋 Event Type:', testEvent.type);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // This will fail verification but shows endpoint is reachable
      },
      body: JSON.stringify(testEvent)
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);

    if (response.status === 200) {
      console.log('✅ Webhook endpoint is reachable!');
      console.log('🎉 Ready for Stripe sandbox testing!');
    } else if (response.status === 400) {
      console.log('⚠️  Webhook signature verification failed (expected in test)');
      console.log('✅ But endpoint is working!');
    } else {
      console.log('⚠️  Unexpected response:', response.status);
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Test different event types
async function testMultipleEvents() {
  const events = [
    {
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_test_1', status: 'active' } }
    },
    {
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'in_test_1', subscription: 'sub_test_1' } }
    },
    {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', mode: 'subscription' } }
    }
  ];

  console.log('\n🔄 Testing multiple event types...');
  
  for (const event of events) {
    console.log(`\n📋 Testing: ${event.type}`);
    // You can add individual event testing here
  }
}

testSandboxWebhook();
testMultipleEvents();
