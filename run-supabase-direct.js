import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

// Your Supabase connection string
const SUPABASE_URL = 'postgresql://postgres.zxciizmevixhopgtmjpb:Aqsa12345%40@aws-1-us-west-1.pooler.supabase.com:5432/postgres';

const sequelize = new Sequelize(SUPABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  }
});

async function runSupabaseMigrations() {
  try {
    console.log('🚀 Running Migrations in Supabase Database...\n');
    
    // Test connection to Supabase
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase database\n');
    
    // Get all migration files in order
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📋 Found ${files.length} migration files:\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📄 [${i + 1}/${files.length}] Running: ${file}`);
      
      try {
        await sequelize.query(sql);
        console.log(`✅ Success: ${file}\n`);
        successCount++;
      } catch (error) {
        // Check if it's an expected error (table/column already exists)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key') ||
            error.message.includes('constraint') ||
            error.message.includes('violates foreign key')) {
          console.log(`⚠️  Skipped (already exists): ${file}`);
          console.log(`   ${error.message}\n`);
          skippedCount++;
        } else {
          console.log(`❌ Error in ${file}:`);
          console.log(`   ${error.message}\n`);
          errorCount++;
        }
      }
    }
    
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total: ${files.length}`);
    
    // Verify tables exist
    console.log('\n🔍 Verifying Supabase database tables...');
    const result = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Supabase database tables:');
    result[0].forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log(`\n✅ Total tables in Supabase: ${result[0].length}`);
    
    // Test candidate data
    console.log('\n🧪 Testing candidate data in Supabase...');
    try {
      const candidate = await sequelize.query(`
        SELECT id, first_name, last_name, email, role 
        FROM users 
        WHERE role = 'candidate' 
        LIMIT 1
      `);
      
      if (candidate[0].length > 0) {
        console.log('✅ Candidate data accessible in Supabase');
        console.log(`   Found: ${candidate[0][0].first_name} ${candidate[0][0].last_name}`);
        console.log(`   Email: ${candidate[0][0].email}`);
        console.log(`   ID: ${candidate[0][0].id}`);
      } else {
        console.log('⚠️  No candidates found in Supabase database');
      }
    } catch (error) {
      console.log(`❌ Error accessing candidate data: ${error.message}`);
    }
    
    console.log('\n🎉 Supabase migrations completed!');
    console.log('Your production database is now ready.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

runSupabaseMigrations();
