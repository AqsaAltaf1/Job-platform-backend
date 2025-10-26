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

async function addTestCandidate() {
  try {
    console.log('👤 Adding test candidate to Supabase...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check if candidate already exists
    const existingCandidate = await sequelize.query(`
      SELECT id FROM users WHERE id = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    `);
    
    if (existingCandidate[0].length > 0) {
      console.log('✅ Test candidate already exists');
    } else {
      console.log('📝 Creating test candidate...');
      
      // Insert user
      await sequelize.query(`
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
        );
      `);
      
      console.log('✅ User created');
    }
    
    // Check if candidate profile exists
    const existingProfile = await sequelize.query(`
      SELECT user_id FROM candidate_profiles WHERE user_id = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    `);
    
    if (existingProfile[0].length > 0) {
      console.log('✅ Candidate profile already exists');
    } else {
      console.log('📝 Creating candidate profile...');
      
      // Insert candidate profile
      await sequelize.query(`
        INSERT INTO candidate_profiles (user_id, bio, location, skills, created_at, updated_at)
        VALUES (
          '9a516981-b719-4d0f-8e9f-8e59b01dbf2d',
          'Experienced software developer with expertise in full-stack development.',
          'New York, NY',
          '["JavaScript", "React", "Node.js", "Python", "PostgreSQL"]',
          NOW(),
          NOW()
        );
      `);
      
      console.log('✅ Candidate profile created');
    }
    
    // Add some experience
    console.log('💼 Adding work experience...');
    await sequelize.query(`
      INSERT INTO experiences (user_id, company_name, position, start_date, end_date, description, created_at, updated_at)
      VALUES (
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
    
    // Add education
    console.log('🎓 Adding education...');
    await sequelize.query(`
      INSERT INTO educations (user_id, institution, degree, field_of_study, graduation_year, created_at, updated_at)
      VALUES (
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
    
    // Verify the data
    console.log('\n🧪 Verifying test data...');
    const candidate = await sequelize.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role,
             cp.bio, cp.location, cp.skills
      FROM users u
      LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
      WHERE u.id = '9a516981-b719-4d0f-8e9f-8e59b01dbf2d';
    `);
    
    if (candidate[0].length > 0) {
      console.log('✅ Test candidate verified:');
      console.log(`   Name: ${candidate[0][0].first_name} ${candidate[0][0].last_name}`);
      console.log(`   Email: ${candidate[0][0].email}`);
      console.log(`   Bio: ${candidate[0][0].bio}`);
      console.log(`   Location: ${candidate[0][0].location}`);
      console.log(`   Skills: ${candidate[0][0].skills}`);
    }
    
    console.log('\n🎉 Test candidate data added successfully!');
    console.log('Your Supabase database now has candidate data.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addTestCandidate();
