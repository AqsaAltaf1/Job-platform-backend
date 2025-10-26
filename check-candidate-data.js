import { Sequelize } from 'sequelize';

// Your Supabase connection string
const SUPABASE_URL = 'postgresql://postgres.zxciizmevixhopgtmjpb:Aqsa12345%40@aws-1-us-west-1.pooler.supabase.com:5432/postgres';

const sequelize = new Sequelize(SUPABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  }
});

async function checkCandidateData() {
  try {
    console.log('👤 Checking candidate data in Supabase...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check all users
    console.log('📋 All users in database:');
    const allUsers = await sequelize.query(`
      SELECT id, email, role, first_name, last_name, is_active, is_verified
      FROM users
      ORDER BY created_at DESC;
    `);
    
    if (allUsers[0].length === 0) {
      console.log('❌ NO USERS FOUND!');
    } else {
      allUsers[0].forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);
      });
    }
    
    // Check candidates specifically
    console.log('\n🎯 Candidates in database:');
    const candidates = await sequelize.query(`
      SELECT id, email, first_name, last_name, is_active, is_verified
      FROM users
      WHERE role = 'candidate';
    `);
    
    if (candidates[0].length === 0) {
      console.log('❌ NO CANDIDATES FOUND!');
    } else {
      candidates[0].forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} (${candidate.email})`);
      });
    }
    
    // Check candidate profiles
    console.log('\n📄 Candidate profiles:');
    const profiles = await sequelize.query(`
      SELECT cp.user_id, cp.first_name, cp.last_name, cp.bio, cp.location
      FROM candidate_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.role = 'candidate';
    `);
    
    if (profiles[0].length === 0) {
      console.log('❌ NO CANDIDATE PROFILES FOUND!');
    } else {
      profiles[0].forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name} - ${profile.bio}`);
      });
    }
    
    // Check our specific test candidate
    console.log('\n🧪 Checking test candidate (9a516981-b719-4d0f-8e9f-8e59b01dbf2d):');
    const testCandidate = await sequelize.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role,
             cp.bio, cp.location, cp.skills
      FROM users u
      LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
      WHERE u.id = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    `);
    
    if (testCandidate[0].length > 0) {
      console.log('✅ Test candidate found:');
      console.log(`   Name: ${testCandidate[0][0].first_name} ${testCandidate[0][0].last_name}`);
      console.log(`   Email: ${testCandidate[0][0].email}`);
      console.log(`   Bio: ${testCandidate[0][0].bio}`);
      console.log(`   Location: ${testCandidate[0][0].location}`);
    } else {
      console.log('❌ Test candidate NOT found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkCandidateData();
