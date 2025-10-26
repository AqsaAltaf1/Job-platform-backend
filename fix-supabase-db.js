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

async function checkAndFixDatabase() {
  try {
    console.log('🔍 Checking Supabase database status...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check what tables exist
    console.log('📋 Checking existing tables...');
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Current tables:');
    tables[0].forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Check if candidate_profiles table exists
    const candidateProfilesExists = tables[0].some(row => row.table_name === 'candidate_profiles');
    
    if (!candidateProfilesExists) {
      console.log('\n❌ candidate_profiles table is missing!');
      console.log('🔧 Creating candidate_profiles table...');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS candidate_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          phone VARCHAR(20),
          bio TEXT,
          job_title VARCHAR(255),
          location VARCHAR(255),
          website VARCHAR(255),
          linkedin_url VARCHAR(255),
          github_url VARCHAR(255),
          profile_picture_url VARCHAR(500),
          skills JSONB,
          experience_years INTEGER,
          education TEXT,
          resume_url VARCHAR(500),
          portfolio_url VARCHAR(500),
          salary_expectation DECIMAL(10,2),
          availability VARCHAR(50),
          date_of_birth DATE,
          country VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `);
      
      console.log('✅ candidate_profiles table created');
    } else {
      console.log('\n✅ candidate_profiles table exists');
    }
    
    // Check if users table has the right structure
    console.log('\n🔍 Checking users table structure...');
    const userColumns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    userColumns[0].forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if password_hash column exists and is nullable
    const passwordHashColumn = userColumns[0].find(col => col.column_name === 'password_hash');
    if (passwordHashColumn && passwordHashColumn.is_nullable === 'NO') {
      console.log('\n🔧 Making password_hash nullable for Google OAuth...');
      await sequelize.query(`
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      `);
      console.log('✅ password_hash is now nullable');
    }
    
    // Add test candidate if none exists
    console.log('\n👤 Checking for candidates...');
    const candidateCount = await sequelize.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'candidate';
    `);
    
    if (candidateCount[0][0].count === '0') {
      console.log('📝 Adding test candidate...');
      
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
        )
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          updated_at = NOW();
      `);
      
      await sequelize.query(`
        INSERT INTO candidate_profiles (user_id, bio, location, skills, created_at, updated_at)
        VALUES (
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
          updated_at = NOW();
      `);
      
      console.log('✅ Test candidate added');
    } else {
      console.log(`✅ Found ${candidateCount[0][0].count} candidates`);
    }
    
    // Final verification
    console.log('\n🧪 Final verification...');
    const testQuery = await sequelize.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role,
             cp.bio, cp.location, cp.skills
      FROM users u
      LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'candidate'
      LIMIT 1;
    `);
    
    if (testQuery[0].length > 0) {
      console.log('✅ Database is ready!');
      console.log(`   Candidate: ${testQuery[0][0].first_name} ${testQuery[0][0].last_name}`);
      console.log(`   Email: ${testQuery[0][0].email}`);
      console.log(`   Bio: ${testQuery[0][0].bio}`);
    }
    
    console.log('\n🎉 Supabase database is now properly configured!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAndFixDatabase();
