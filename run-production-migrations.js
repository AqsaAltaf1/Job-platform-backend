import { sequelize } from './models/index.js';
import fs from 'fs';
import path from 'path';

async function runProductionMigrations() {
  try {
    console.log('🚀 Running Production Database Migrations...\n');
    
    // Test connection to production database
    await sequelize.authenticate();
    console.log('✅ Connected to production database\n');
    
    // Check if users table exists
    console.log('1️⃣ Checking if users table exists...');
    try {
      const result = await sequelize.query('SELECT COUNT(*) FROM users LIMIT 1');
      console.log('✅ Users table exists');
    } catch (error) {
      console.log('❌ Users table does not exist - running migrations...\n');
      
      // Get all migration files in order
      const migrationsDir = path.join(process.cwd(), 'migrations');
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`📋 Found ${files.length} migration files:\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
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
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key') ||
              error.message.includes('constraint')) {
            console.log(`⚠️  Skipped (already exists): ${file}\n`);
          } else {
            console.log(`❌ Error in ${file}:`);
            console.log(`   ${error.message}\n`);
            errorCount++;
          }
        }
      }
      
      console.log('📊 Migration Summary:');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Errors: ${errorCount}`);
      console.log(`📋 Total: ${files.length}`);
    }
    
    // Verify tables exist
    console.log('\n2️⃣ Verifying production database tables...');
    const result = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Production database tables:');
    result[0].forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    console.log(`\n✅ Total tables in production: ${result[0].length}`);
    
    // Test candidate data
    console.log('\n3️⃣ Testing candidate data access...');
    try {
      const candidate = await sequelize.query(`
        SELECT id, first_name, last_name, email, role 
        FROM users 
        WHERE role = 'candidate' 
        LIMIT 1
      `);
      
      if (candidate[0].length > 0) {
        console.log('✅ Candidate data accessible');
        console.log(`   Found: ${candidate[0][0].first_name} ${candidate[0][0].last_name}`);
      } else {
        console.log('⚠️  No candidates found in production database');
      }
    } catch (error) {
      console.log(`❌ Error accessing candidate data: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

runProductionMigrations();
