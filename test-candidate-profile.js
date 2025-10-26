import { sequelize } from './models/index.js';
import { User, CandidateProfile } from './models/index.js';

async function testCandidateProfile() {
  try {
    console.log('🔍 Testing candidate profile access...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    const candidateId = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    
    // Test the exact logic from getCandidateProfile
    console.log(`1️⃣ Testing getCandidateProfile logic for ID: ${candidateId}`);
    
    const candidate = await User.findOne({
      where: { 
        id: candidateId,
        role: 'candidate',
        is_active: true 
      },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: true
        }
      ]
    });
    
    if (candidate) {
      console.log('✅ Candidate found!');
      console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
      console.log(`   Email: ${candidate.email}`);
      console.log(`   Role: ${candidate.role}`);
      console.log(`   Active: ${candidate.is_active}`);
      console.log(`   Profile exists: ${candidate.candidateProfile ? 'Yes' : 'No'}`);
      
      if (candidate.candidateProfile) {
        console.log(`   Location: ${candidate.candidateProfile.location}`);
        console.log(`   Bio: ${candidate.candidateProfile.bio?.substring(0, 50)}...`);
      }
    } else {
      console.log('❌ Candidate not found');
      
      // Check if user exists with different conditions
      console.log('\n2️⃣ Checking if user exists with different conditions:');
      
      const userExists = await User.findOne({
        where: { id: candidateId }
      });
      
      if (userExists) {
        console.log(`   User exists: ${userExists.first_name} ${userExists.last_name}`);
        console.log(`   Role: ${userExists.role}`);
        console.log(`   Active: ${userExists.is_active}`);
      } else {
        console.log('   User does not exist with this ID');
      }
      
      // Check all candidates
      console.log('\n3️⃣ All candidates in database:');
      const allCandidates = await User.findAll({
        where: { role: 'candidate' },
        attributes: ['id', 'first_name', 'last_name', 'email', 'is_active']
      });
      
      allCandidates.forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name}`);
        console.log(`      ID: ${candidate.id}`);
        console.log(`      Email: ${candidate.email}`);
        console.log(`      Active: ${candidate.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testCandidateProfile();
