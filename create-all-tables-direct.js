import { Sequelize } from 'sequelize';

// Direct connection to Supabase
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: console.log
});

async function createAllTables() {
  try {
    console.log('🔄 Creating all tables directly in Supabase...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase!');
    
    // Create users table
    console.log('📄 Creating users table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'candidate',
        is_verified BOOLEAN DEFAULT FALSE,
        verification_status VARCHAR(50) DEFAULT 'pending',
        verification_token VARCHAR(255),
        verification_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created!');
    
    // Create candidate_profiles table
    console.log('📄 Creating candidate_profiles table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS candidate_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        location VARCHAR(255),
        bio TEXT,
        profile_picture TEXT,
        date_of_birth DATE,
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Candidate profiles table created!');
    
    // Create employer_profiles table
    console.log('📄 Creating employer_profiles table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        company_legal_name VARCHAR(255),
        industry VARCHAR(100),
        company_size VARCHAR(50),
        website VARCHAR(255),
        description TEXT,
        logo TEXT,
        location VARCHAR(255),
        is_primary_owner BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employer profiles table created!');
    
    // Create experiences table
    console.log('📄 Creating experiences table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        company VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        current BOOLEAN DEFAULT FALSE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Experiences table created!');
    
    // Create educations table
    console.log('📄 Creating educations table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS educations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(255) NOT NULL,
        field_of_study VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE,
        current BOOLEAN DEFAULT FALSE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Educations table created!');
    
    // Create projects table
    console.log('📄 Creating projects table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        technologies TEXT[],
        start_date DATE,
        end_date DATE,
        url VARCHAR(255),
        github_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Projects table created!');
    
    // Create jobs table
    console.log('📄 Creating jobs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        employer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        location VARCHAR(255),
        salary_min INTEGER,
        salary_max INTEGER,
        employment_type VARCHAR(50),
        experience_level VARCHAR(50),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Jobs table created!');
    
    // Create job_applications table
    console.log('📄 Creating job_applications table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'applied',
        cover_letter TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, candidate_id)
      );
    `);
    console.log('✅ Job applications table created!');
    
    // Create OTP table
    console.log('📄 Creating OTP table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ OTP table created!');
    
    console.log('\n🎉 All core tables created successfully in Supabase!');
    console.log('🚀 Your job portal database is ready!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

createAllTables();
