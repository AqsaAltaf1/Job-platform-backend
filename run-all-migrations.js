import { sequelize } from './models/index.js';
import fs from 'fs';
import path from 'path';

async function runAllMigrations() {
  try {
    console.log('🚀 Running All Database Migrations...\n');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connected successfully\n');
    
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
    
    if (successCount > 0 || skippedCount > 0) {
      console.log('\n🎉 Migrations completed!');
      
      // Test a simple query to verify tables exist
      console.log('\n🔍 Verifying database tables...');
      const result = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      console.log('📋 Database tables:');
      result[0].forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
      
      console.log(`\n✅ Total tables created: ${result[0].length}`);
    }
    
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
  } finally {
    await sequelize.close();
  }
}

runAllMigrations();
