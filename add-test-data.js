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

async function addTestData() {
  try {
    console.log('🚀 Adding test data to Supabase...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Add a test candidate
    console.log('👤 Adding test candidate...');
    const candidateResult = await sequelize.query(`
      INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, is_active, is_verified, created_at, updated_at)
      VALUES (
        '9a516981-b719-4d0f-8e9f-8e59b01dbf2d',
        'test.candidate@example.com',
        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'candidate',
        'John',
        'Doe',
        '+1234567890',
        true,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        updated_at = NOW()
      RETURNING id, first_name, last_name, email;
    `);
    
    console.log('✅ Test candidate added:', candidateResult[0][0]);
    
    // Add candidate profile
    console.log('\n📋 Adding candidate profile...');
    const profileResult = await sequelize.query(`
      INSERT INTO candidate_profiles (id, user_id, bio, location, skills, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '9a516981-b719-4d0f-8e9f-8e59b01dbf2d',
        'Experienced software developer with expertise in full-stack development.',
        'New York, NY',
        '["JavaScript", "React", "Node.js", "Python", "PostgreSQL"]',
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        skills = EXCLUDED.skills,
        updated_at = NOW()
      RETURNING id, bio, location;
    `);
    
    console.log('✅ Candidate profile added:', profileResult[0][0]);
    
    // Add some experience
    console.log('\n💼 Adding work experience...');
    await sequelize.query(`
      INSERT INTO experiences (id, user_id, company_name, position, start_date, end_date, description, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '9a516981-b719-4d0f-8e9f-8e59b01dbf2d',
        'Tech Corp',
        'Senior Developer',
        '2022-01-01',
        '2024-01-01',
        'Led development of web applications using React and Node.js',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Work experience added');
    
    // Add education
    console.log('\n🎓 Adding education...');
    await sequelize.query(`
      INSERT INTO educations (id, user_id, institution, degree, field_of_study, graduation_year, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '9a516981-b719-4d0f-8e9f-8e59b01dbf2d',
        'University of Technology',
        'Bachelor of Science',
        'Computer Science',
        2020,
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Education added');
    
    // Verify the data
    console.log('\n🔍 Verifying test data...');
    const candidate = await sequelize.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role,
             cp.bio, cp.location, cp.skills
      FROM users u
      LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
      WHERE u.id = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d'
    `);
    
    if (candidate[0].length > 0) {
      console.log('✅ Test candidate verified:');
      console.log(`   Name: ${candidate[0][0].first_name} ${candidate[0][0].last_name}`);
      console.log(`   Email: ${candidate[0][0].email}`);
      console.log(`   Bio: ${candidate[0][0].bio}`);
      console.log(`   Location: ${candidate[0][0].location}`);
      console.log(`   Skills: ${candidate[0][0].skills}`);
    }
    
    console.log('\n🎉 Test data added successfully!');
    console.log('Your Supabase database now has candidate data.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addTestData();
