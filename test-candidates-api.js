import { sequelize } from './models/index.js';
import { User, CandidateProfile } from './models/index.js';

async function testCandidatesAPI() {
  try {
    console.log('🧪 Testing Candidates API Logic...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Test the exact logic from getCandidates
    console.log('1️⃣ Testing getCandidates logic:');
    const candidates = await User.findAndCountAll({
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
    
    console.log(`   Found ${candidates.count} candidates`);
    
    if (candidates.count > 0) {
      console.log('\n📋 Candidates found:');
      candidates.rows.forEach((candidate, index) => {
        console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} (${candidate.email})`);
        console.log(`      Location: ${candidate.candidateProfile?.location}`);
        console.log(`      Availability: ${candidate.candidateProfile?.availability}`);
        console.log(`      Bio: ${candidate.candidateProfile?.bio?.substring(0, 50)}...`);
      });
      
      // Test the API response format
      console.log('\n2️⃣ API Response format:');
      const apiResponse = {
        success: true,
        candidates: candidates.rows.map(candidate => ({
          id: candidate.id,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.candidateProfile?.location,
          availability: candidate.candidateProfile?.availability,
          bio: candidate.candidateProfile?.bio,
          profile_picture_url: candidate.candidateProfile?.profile_picture_url,
          experience_years: candidate.candidateProfile?.experience_years,
          salary_expectation: candidate.candidateProfile?.salary_expectation,
          skills: candidate.candidateProfile?.skills || [],
          created_at: candidate.created_at
        })),
        pagination: {
          current_page: 1,
          total_pages: Math.ceil(candidates.count / 15),
          total_candidates: candidates.count,
          per_page: 15
        }
      };
      
      console.log(JSON.stringify(apiResponse, null, 2));
    } else {
      console.log('❌ No candidates found');
    }
    
    // Test the testCandidates logic
    console.log('\n3️⃣ Testing testCandidates logic:');
    const testCandidates = await User.findAll({
      where: { role: 'candidate', is_active: true },
      include: [
        {
          model: CandidateProfile,
          as: 'candidateProfile',
          required: false
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    
    console.log(`   Found ${testCandidates.length} test candidates`);
    testCandidates.forEach((candidate, index) => {
      console.log(`   ${index + 1}. ${candidate.first_name} ${candidate.last_name} (${candidate.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  } finally {
    await sequelize.close();
  }
}

testCandidatesAPI();

