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

async function checkRenderDatabaseConnection() {
  try {
    console.log('🔍 Checking if Render is connecting to the same Supabase database...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check if the columns we added exist
    console.log('📋 Checking employer_profiles columns...');
    const columns = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'employer_profiles' AND table_schema = 'public'
      AND column_name IN ('company_legal_name', 'company_display_name', 'company_logo_url');
    `);
    
    console.log('Required columns found:');
    columns[0].forEach(col => {
      console.log(`   ✅ ${col.column_name}`);
    });
    
    if (columns[0].length === 3) {
      console.log('\n✅ All required columns exist in Supabase!');
    } else {
      console.log('\n❌ Some columns are missing!');
    }
    
    // Check if audit_logs table exists
    console.log('\n📋 Checking audit_logs table...');
    const auditLogsExists = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'audit_logs' AND table_schema = 'public';
    `);
    
    if (auditLogsExists[0].length > 0) {
      console.log('✅ audit_logs table exists');
    } else {
      console.log('❌ audit_logs table does not exist');
      console.log('🔧 Creating audit_logs table...');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action_type VARCHAR(100) NOT NULL,
          action_category VARCHAR(100) NOT NULL,
          description TEXT,
          target_user_id UUID,
          target_resource_id UUID,
          target_resource_type VARCHAR(100),
          metadata JSONB,
          ip_address INET,
          user_agent TEXT,
          session_id VARCHAR(255),
          performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      console.log('✅ audit_logs table created');
    }
    
    // Check the specific user that's failing
    console.log('\n👤 Checking user fac7df54-656e-4e8a-beeb-7c29570afd66...');
    const user = await sequelize.query(`
      SELECT id, email, role, first_name, last_name, is_active, is_verified
      FROM users
      WHERE id = 'fac7df54-656e-4e8a-beeb-7c29570afd66';
    `);
    
    if (user[0].length > 0) {
      console.log('✅ User found in Supabase:');
      console.log(`   Email: ${user[0][0].email}`);
      console.log(`   Role: ${user[0][0].role}`);
      console.log(`   Name: ${user[0][0].first_name} ${user[0][0].last_name}`);
    } else {
      console.log('❌ User not found in Supabase');
    }
    
    // Test the exact query that's failing
    console.log('\n🧪 Testing the Google login query...');
    try {
      await sequelize.query(`
        SELECT "User"."id", "User"."email", "User"."password_hash", "User"."role", 
               "employerProfile"."company_legal_name", "employerProfile"."company_display_name"
        FROM "users" AS "User" 
        LEFT OUTER JOIN "employer_profiles" AS "employerProfile" ON "User"."id" = "employerProfile"."user_id" 
        WHERE "User"."id" = 'fac7df54-656e-4e8a-beeb-7c29570afd66'
        LIMIT 1;
      `);
      console.log('✅ Google login query works in Supabase!');
    } catch (error) {
      console.log(`❌ Query fails in Supabase: ${error.message}`);
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('If the query works here but fails on Render, then:');
    console.log('1. Render might be connecting to a different database');
    console.log('2. Render might have cached the old schema');
    console.log('3. Render might need to be restarted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkRenderDatabaseConnection();
