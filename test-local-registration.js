import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001';

async function testLocalRegistration() {
  console.log('🧪 Testing Local User Registration...\n');

  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User',
    role: 'candidate'
  };

  try {
    // Test 1: Check if service is running locally
    console.log('1️⃣ Testing local service health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'healthy') {
      console.log('✅ Local service is healthy');
    } else {
      console.log('❌ Local service health check failed:', healthData.message);
      return;
    }

    // Test 2: Test user registration
    console.log('\n2️⃣ Testing user registration...');
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ User registration successful');
      console.log('User ID:', registerData.user?.id);
      console.log('Email:', registerData.user?.email);
    } else {
      console.log('❌ User registration failed:', registerData.message);
      
      if (registerData.message?.includes('already exists')) {
        console.log('ℹ️  User already exists, testing login instead...');
        await testUserLogin();
      }
    }

    // Test 3: Test user login
    console.log('\n3️⃣ Testing user login...');
    await testUserLogin();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure to start the local server first:');
    console.log('   node server.js');
  }
}

async function testUserLogin() {
  try {
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!'
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ User login successful');
      console.log('Token received:', loginData.token ? 'Yes' : 'No');
      console.log('User role:', loginData.user?.role);
    } else {
      console.log('❌ User login failed:', loginData.message);
    }
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

// Run test
testLocalRegistration();
