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

async function fixEmployerProfilesTable() {
  try {
    console.log('🔧 Fixing employer_profiles table structure...\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase\n');
    
    // Check current employer_profiles table structure
    console.log('📋 Current employer_profiles columns:');
    const columns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employer_profiles' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    columns[0].forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Add missing columns
    console.log('\n🔧 Adding missing columns...');
    
    const missingColumns = [
      'company_legal_name VARCHAR(255)',
      'company_display_name VARCHAR(255)',
      'company_description TEXT',
      'company_logo_url VARCHAR(500)',
      'company_website VARCHAR(255)',
      'careers_page_url VARCHAR(255)',
      'company_industry VARCHAR(100)',
      'company_sector VARCHAR(100)',
      'company_size VARCHAR(50)',
      'company_location VARCHAR(255)',
      'headquarters_location VARCHAR(255)',
      'remote_policy VARCHAR(100)',
      'is_primary_owner BOOLEAN DEFAULT false',
      'account_role VARCHAR(50)',
      'permissions JSONB'
    ];
    
    for (const column of missingColumns) {
      const columnName = column.split(' ')[0];
      
      // Check if column already exists
      const exists = columns[0].some(col => col.column_name === columnName);
      
      if (!exists) {
        try {
          await sequelize.query(`ALTER TABLE employer_profiles ADD COLUMN ${column};`);
          console.log(`✅ Added column: ${columnName}`);
        } catch (error) {
          console.log(`⚠️  Column ${columnName} might already exist: ${error.message}`);
        }
      } else {
        console.log(`✅ Column ${columnName} already exists`);
      }
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying employer_profiles table...');
    const updatedColumns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employer_profiles' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Updated employer_profiles columns:');
    updatedColumns[0].forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log(`\n✅ Total columns: ${updatedColumns[0].length}`);
    
    // Test the problematic query
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
      console.log('✅ Google login query now works!');
    } catch (error) {
      console.log(`❌ Query still fails: ${error.message}`);
    }
    
    console.log('\n🎉 Employer profiles table fixed!');
    console.log('Google login should now work properly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixEmployerProfilesTable();
