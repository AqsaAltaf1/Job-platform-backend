import { sequelize } from './models/index.js';
import { User, CandidateProfile } from './models/index.js';

async function checkCandidatesInDatabase() {
  try {
    console.log('🔍 Checking candidates in database...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Check all users
    console.log('1️⃣ All users in database:');
    const allUsers = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    });
    
    console.log(`   Total users: ${allUsers.length}`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    // Check users with candidate role
    console.log('\n2️⃣ Users with candidate role:');
    const candidateUsers = await User.findAll({
      where: { role: 'candidate' },
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    });
    
    console.log(`   Total candidates: ${candidateUsers.length}`);
    candidateUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - Active: ${user.is_active}`);
    });
    
    // Check active candidates
    console.log('\n3️⃣ Active candidates:');
    const activeCandidates = await User.findAll({
      where: { 
        role: 'candidate',
        is_active: true 
      },
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at']
    });
    
    console.log(`   Total active candidates: ${activeCandidates.length}`);
    activeCandidates.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
    });
    
    // Check candidate profiles
    console.log('\n4️⃣ Candidate profiles:');
    const candidateProfiles = await CandidateProfile.findAll({
      attributes: ['id', 'user_id', 'location', 'availability', 'is_active', 'bio'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active']
      }]
    });
    
    console.log(`   Total candidate profiles: ${candidateProfiles.length}`);
    candidateProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. User: ${profile.user?.first_name} ${profile.user?.last_name} (${profile.user?.email})`);
      console.log(`      Profile ID: ${profile.id}, Location: ${profile.location}, Active: ${profile.is_active}`);
    });
    
    // Check active candidate profiles
    console.log('\n5️⃣ Active candidate profiles:');
    const activeProfiles = await CandidateProfile.findAll({
      where: { is_active: true },
      attributes: ['id', 'user_id', 'location', 'availability', 'is_active', 'bio'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'is_active']
      }]
    });
    
    console.log(`   Total active profiles: ${activeProfiles.length}`);
    activeProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. User: ${profile.user?.first_name} ${profile.user?.last_name} (${profile.user?.email})`);
      console.log(`      Location: ${profile.location}, Availability: ${profile.availability}`);
    });
    
    // Check what the API would return
    console.log('\n6️⃣ What the API would return (matching getCandidates logic):');
    const apiCandidates = await User.findAndCountAll({
      where: {
        role: 'candidate',
        is_active: true
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true,
          where: {
            is_active: true
          }
        }
      ],
      limit: 15,
      offset: 0,
      order: [['created_at', 'DESC']],
      distinct: true
    });
    
    console.log(`   API would return: ${apiCandidates.count} candidates`);
    apiCandidates.rows.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} (${candidate.email})`);
    });
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Users with candidate role: ${candidateUsers.length}`);
    console.log(`   Active candidates: ${activeCandidates.length}`);
    console.log(`   Total candidate profiles: ${candidateProfiles.length}`);
    console.log(`   Active candidate profiles: ${activeProfiles.length}`);
    console.log(`   API would return: ${apiCandidates.count} candidates`);
    
    if (apiCandidates.count === 0) {
      console.log('\n🔧 Possible issues:');
      console.log('   1. Users don\'t have role "candidate"');
      console.log('   2. Users are not active (is_active = false)');
      console.log('   3. Users don\'t have candidate profiles');
      console.log('   4. Candidate profiles are not active (is_active = false)');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkCandidatesInDatabase();
