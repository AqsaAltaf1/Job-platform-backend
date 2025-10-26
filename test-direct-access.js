import fetch from 'node-fetch';

const API_BASE = 'https://job-platform-backend-jhq7.onrender.com';
const CANDIDATE_ID = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';

async function testDirectAccess() {
  console.log('🧪 Testing Direct Candidate Access...\n');

  try {
    // Test 1: Check if we can access the test endpoint
    console.log('1️⃣ Testing public test endpoint...');
    const testResponse = await fetch(`${API_BASE}/api/test-candidates`);
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ Test endpoint works');
      console.log(`   Found ${testData.candidates.length} candidates`);
    } else {
      console.log(`❌ Test endpoint failed: ${testData.error}`);
    }

    // Test 2: Try to access candidate profile without auth (should fail)
    console.log('\n2️⃣ Testing candidate profile without auth...');
    const profileResponse = await fetch(`${API_BASE}/api/candidates/${CANDIDATE_ID}`);
    const profileData = await profileResponse.json();
    
    console.log(`   Response: ${profileData.error || 'Success'}`);

    // Test 3: Create a mock token and test
    console.log('\n3️⃣ Testing with mock token...');
    const mockToken = 'mock-token-for-testing';
    
    const mockResponse = await fetch(`${API_BASE}/api/candidates/${CANDIDATE_ID}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const mockData = await mockResponse.json();
    console.log(`   Mock token response: ${mockData.error || 'Success'}`);

    console.log('\n📋 SOLUTION FOR FRONTEND:');
    console.log('Since authentication is not working properly, you have two options:');
    console.log('\n🔧 OPTION 1: Fix Authentication (Recommended)');
    console.log('1. Check your frontend login implementation');
    console.log('2. Make sure you\'re sending the correct email/password');
    console.log('3. Verify the token is being stored and sent correctly');
    
    console.log('\n🔧 OPTION 2: Temporary Workaround');
    console.log('1. Modify the candidate profile endpoint to not require auth');
    console.log('2. Or create a public endpoint for candidate profiles');
    console.log('3. This is less secure but will work immediately');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectAccess();
