import { sequelize } from './models/index.js';
import fs from 'fs';
import path from 'path';

async function runMigrationsOneByOne() {
  try {
    console.log('🚀 Running database migrations one by one...\n');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
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
        console.log(`❌ Error in ${file}:`);
        console.log(`   ${error.message}\n`);
        errorCount++;
        
        // Continue with other migrations even if one fails
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('already exists')) {
          console.log(`   ℹ️  This is expected - table/column already exists\n`);
        }
      }
    }
    
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total: ${files.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Migrations completed!');
      
      // Test a simple query to verify tables exist
      console.log('\n🔍 Verifying database tables...');
      const result = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      console.log('📋 Created tables:');
      result[0].forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
  } finally {
    await sequelize.close();
  }
}

runMigrationsOneByOne();
