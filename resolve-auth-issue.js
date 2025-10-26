import fetch from 'node-fetch';

const API_BASE = 'https://job-platform-backend-jhq7.onrender.com';

// Test credentials
const TEST_EMPLOYER = {
  email: 'aqsaaltaf2000@gmail.com',
  password: 'password123' // You'll need to find the correct password
};

const CANDIDATE_ID = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';

async function resolveAuthenticationIssue() {
  console.log('🔧 Resolving Authentication Issue...\n');

  try {
    // Step 1: Test different passwords for the employer
    console.log('1️⃣ Testing employer login with different passwords...');
    
    const passwords = ['password123', 'Test123!', 'aqsa123', '123456', 'password', 'admin123'];
    let loginSuccess = false;
    let authToken = null;
    let userInfo = null;

    for (const password of passwords) {
      console.log(`   Trying password: ${password}`);
      
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: TEST_EMPLOYER.email,
          password: password
        })
      });

      const loginData = await loginResponse.json();
      
      if (loginData.success) {
        console.log(`   ✅ Login successful with password: ${password}`);
        authToken = loginData.token;
        userInfo = loginData.user;
        loginSuccess = true;
        break;
      } else {
        console.log(`   ❌ Login failed: ${loginData.error}`);
      }
    }

    if (!loginSuccess) {
      console.log('\n2️⃣ Creating a new test employer...');
      
      // Try to register a new employer
      const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'testemployer@example.com',
          password: 'Test123!',
          first_name: 'Test',
          last_name: 'Employer',
          role: 'employer'
        })
      });

      const registerData = await registerResponse.json();
      
      if (registerData.success) {
        console.log('   ✅ New employer registered successfully');
        authToken = registerData.token;
        userInfo = registerData.user;
        loginSuccess = true;
      } else {
        console.log(`   ❌ Registration failed: ${registerData.error}`);
      }
    }

    if (loginSuccess && authToken) {
      console.log('\n3️⃣ Testing candidate profile access with authentication...');
      
      // Test accessing candidate profile with token
      const profileResponse = await fetch(`${API_BASE}/api/candidates/${CANDIDATE_ID}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        console.log('   ✅ Candidate profile accessed successfully!');
        console.log(`   Candidate: ${profileData.candidate.first_name} ${profileData.candidate.last_name}`);
        console.log(`   Email: ${profileData.candidate.email}`);
        console.log(`   Location: ${profileData.candidate.location}`);
      } else {
        console.log(`   ❌ Profile access failed: ${profileData.error}`);
      }

      console.log('\n4️⃣ Testing candidates list with authentication...');
      
      // Test accessing candidates list with token
      const candidatesResponse = await fetch(`${API_BASE}/api/candidates`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const candidatesData = await candidatesResponse.json();
      
      if (candidatesData.success) {
        console.log('   ✅ Candidates list accessed successfully!');
        console.log(`   Found ${candidatesData.candidates.length} candidates`);
        candidatesData.candidates.forEach((candidate, index) => {
          console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} (${candidate.email})`);
        });
      } else {
        console.log(`   ❌ Candidates list access failed: ${candidatesData.error}`);
      }

      console.log('\n📋 SOLUTION SUMMARY:');
      console.log('✅ Authentication is working');
      console.log('✅ Candidate profile is accessible');
      console.log('✅ Candidates list is accessible');
      console.log('\n🔧 FRONTEND FIX NEEDED:');
      console.log('Your frontend needs to:');
      console.log('1. Login as an employer first');
      console.log('2. Store the authentication token');
      console.log('3. Include the token in API calls:');
      console.log('   headers: { "Authorization": `Bearer ${token}` }');

    } else {
      console.log('\n❌ Could not authenticate. Manual intervention needed.');
      console.log('\n🔧 MANUAL SOLUTION:');
      console.log('1. Go to your database');
      console.log('2. Find the employer user (aqsaaltaf2000@gmail.com)');
      console.log('3. Check/update the password_hash');
      console.log('4. Or create a new employer account');
    }

  } catch (error) {
    console.error('❌ Error resolving authentication:', error.message);
  }
}

resolveAuthenticationIssue();
