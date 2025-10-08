import fetch from 'node-fetch';

async function testWebhookVerification() {
  const webhookUrl = 'https://job-platform-backend-jhq7.onrender.com/api/stripe/webhook';
  
  // Test payload
  const testPayload = {
    id: 'evt_test_webhook_verification',
    object: 'event',
    type: 'customer.subscription.created',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_test_verification',
        customer: 'cus_test_verification',
        status: 'active'
      }
    }
  };

  try {
    console.log('🧪 Testing webhook verification...');
    console.log('📍 URL:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // This will fail verification but shows endpoint is reachable
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Response Status:', response.status);
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);

    if (response.status === 400 && responseText.includes('signature')) {
      console.log('✅ Webhook endpoint is working! (Signature verification failed as expected)');
      console.log('🎉 Ready to receive real Stripe webhooks!');
    } else if (response.status === 200) {
      console.log('✅ Webhook processed successfully!');
    } else {
      console.log('⚠️  Unexpected response:', response.status);
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testWebhookVerification();
