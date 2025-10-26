import { sequelize } from './models/index.js';
import { User, CandidateProfile, Experience, Education, Project } from './models/index.js';

async function testCompleteCandidateData() {
  try {
    console.log('🧪 Testing Complete Candidate Data...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    const candidateId = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    
    // Test the complete candidate query
    console.log(`1️⃣ Testing complete candidate query for ID: ${candidateId}`);
    
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
          required: true,
          include: [
            {
              model: Experience,
              as: 'experiences',
              required: false,
              order: [['start_date', 'DESC']]
            },
            {
              model: Education,
              as: 'educations',
              required: false,
              order: [['graduation_year', 'DESC']]
            },
            {
              model: Project,
              as: 'projects',
              required: false,
              order: [['created_at', 'DESC']]
            }
          ]
        }
      ]
    });
    
    if (candidate) {
      console.log('✅ Complete candidate data found!');
      console.log(`   Name: ${candidate.first_name} ${candidate.last_name}`);
      console.log(`   Email: ${candidate.email}`);
      console.log(`   Phone: ${candidate.phone}`);
      console.log(`   Location: ${candidate.candidateProfile?.location}`);
      console.log(`   Bio: ${candidate.candidateProfile?.bio?.substring(0, 50)}...`);
      console.log(`   Skills: ${candidate.candidateProfile?.skills?.length || 0} skills`);
      console.log(`   Experiences: ${candidate.candidateProfile?.experiences?.length || 0} experiences`);
      console.log(`   Educations: ${candidate.candidateProfile?.educations?.length || 0} educations`);
      console.log(`   Projects: ${candidate.candidateProfile?.projects?.length || 0} projects`);
      
      // Show sample data structure
      console.log('\n2️⃣ Sample data structure:');
      const sampleData = {
        id: candidate.id,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        profile: {
          location: candidate.candidateProfile?.location,
          bio: candidate.candidateProfile?.bio?.substring(0, 100),
          skills: candidate.candidateProfile?.skills || [],
          experience_years: candidate.candidateProfile?.experience_years,
          salary_expectation: candidate.candidateProfile?.salary_expectation
        },
        experiences: candidate.candidateProfile?.experiences?.map(exp => ({
          company_name: exp.company_name,
          job_title: exp.job_title,
          start_date: exp.start_date,
          end_date: exp.end_date
        })) || [],
        educations: candidate.candidateProfile?.educations?.map(edu => ({
          institution_name: edu.institution_name,
          degree: edu.degree,
          field_of_study: edu.field_of_study
        })) || [],
        projects: candidate.candidateProfile?.projects?.map(proj => ({
          project_name: proj.project_name,
          description: proj.description?.substring(0, 50),
          technologies_used: proj.technologies_used || []
        })) || []
      };
      
      console.log(JSON.stringify(sampleData, null, 2));
      
    } else {
      console.log('❌ Candidate not found');
    }
    
    console.log('\n📋 FRONTEND INTEGRATION:');
    console.log('Once deployed, your frontend can call:');
    console.log(`GET /api/public/candidates/${candidateId}`);
    console.log('\nThis will return all candidate data including:');
    console.log('✅ Basic info (name, email, phone)');
    console.log('✅ Profile details (bio, skills, location)');
    console.log('✅ Work experience');
    console.log('✅ Education history');
    console.log('✅ Projects portfolio');
    console.log('✅ All other profile fields');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testCompleteCandidateData();
