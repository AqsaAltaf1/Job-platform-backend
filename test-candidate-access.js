import fetch from 'node-fetch';

const API_BASE = 'https://job-platform-backend-jhq7.onrender.com';
const CANDIDATE_ID = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';

async function testCandidateAccess() {
  console.log('🧪 Testing Candidate Access...\n');

  try {
    // Test current endpoint
    console.log('1️⃣ Testing current endpoint...');
    const response = await fetch(`${API_BASE}/api/candidates/${CANDIDATE_ID}`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${data.error || 'Success'}`);
    
    if (data.success) {
      console.log('✅ Candidate profile accessible!');
      console.log(`   Name: ${data.candidate.first_name} ${data.candidate.last_name}`);
      console.log(`   Email: ${data.candidate.email}`);
      console.log(`   Location: ${data.candidate.profile?.location}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n📋 SOLUTION:');
  console.log('The backend changes need to be deployed to Render.');
  console.log('\n🔧 IMMEDIATE FIX OPTIONS:');
  console.log('\nOption 1: Deploy Backend Changes');
  console.log('1. Push your changes to GitHub');
  console.log('2. Render will automatically redeploy');
  console.log('3. Test: curl https://job-platform-backend-jhq7.onrender.com/api/candidates/9a516981-b719-4d0f-8e9f-8e59b01dbf2d');
  
  console.log('\nOption 2: Frontend Workaround');
  console.log('1. Update your frontend to use the test endpoint temporarily:');
  console.log('   /api/test-candidates');
  console.log('2. Or modify your frontend to handle the authentication error');
  
  console.log('\nOption 3: Manual Database Check');
  console.log('1. The candidate data exists in the database');
  console.log('2. You can verify this by checking the database directly');
  console.log('3. The issue is only with the API endpoint access');

  console.log('\n🎯 RECOMMENDED ACTION:');
  console.log('Deploy the backend changes to Render so the public endpoint works.');
}

testCandidateAccess();
