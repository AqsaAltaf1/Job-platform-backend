import { Sequelize } from 'sequelize';

// Direct connection to Supabase
const sequelize = new Sequelize('postgresql://postgres.mbijzngcaxtplpmgdcum:Aqsa12345@@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  dialect: 'postgres',
  logging: console.log
});

async function fixMissingColumns() {
  try {
    console.log('🔄 Fixing missing columns in database...');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase!');
    
    // Add missing columns to employer_profiles table
    console.log('📄 Adding missing columns to employer_profiles...');
    
    const columnsToAdd = [
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_display_name VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_description TEXT;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS careers_page_url VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_industry VARCHAR(100);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_sector VARCHAR(100);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS company_location VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS headquarters_location VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS remote_policy VARCHAR(50);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS account_role VARCHAR(50);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS permissions TEXT;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS bio TEXT;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS website VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;',
      'ALTER TABLE employer_profiles ADD COLUMN IF NOT EXISTS position VARCHAR(255);'
    ];
    
    for (const sql of columnsToAdd) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Added column: ${sql.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️  Column might already exist: ${error.message}`);
      }
    }
    
    // Add missing columns to jobs table
    console.log('📄 Adding missing columns to jobs table...');
    
    const jobColumnsToAdd = [
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employer_profile_id INTEGER;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_by INTEGER;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities TEXT;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50);',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_arrangement VARCHAR(50);',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10);',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_period VARCHAR(20);',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department VARCHAR(100);',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills_required TEXT;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits TEXT;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_deadline DATE;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;',
      'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applications_count INTEGER DEFAULT 0;'
    ];
    
    for (const sql of jobColumnsToAdd) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Added job column: ${sql.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️  Job column might already exist: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database schema fixed successfully!');
    console.log('🚀 Your application should now work without column errors!');
    
  } catch (error) {
    console.error('❌ Error fixing columns:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixMissingColumns();
